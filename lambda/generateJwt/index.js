const https = require('https');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Firebase initialisieren (Service Account aus Datei)
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'serviceAccount.json'), 'utf8')
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const API_KEY = process.env.API_KEY;
const AYRSHARE_PRIVATE_KEY = fs.readFileSync(
    path.join(__dirname, 'private-key.pem'), 'utf8'
).trim();

exports.handler = async (event) => {
    // OPTIONS Request für CORS Preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: ''
        };
    }

    try {
        // userId aus Query-Parametern oder Body extrahieren
        let userId = event.queryStringParameters?.userId;

        if (!userId) {
            try {
                const body = JSON.parse(event.body || '{}');
                userId = body.userId;
            } catch (e) {
                // ignore parse error
            }
        }

        if (!userId) {
            return errorResponse(400, 'User-ID fehlt');
        }

        console.log('JWT-Generierung für userId:', userId);

        // ProfileKey aus Firebase holen
        const doc = await db.collection('ayrshare_profiles').doc(userId).get();

        if (!doc.exists) {
            return errorResponse(404, 'Kein Ayrshare-Profil gefunden. Bitte zuerst ein Profil erstellen.');
        }

        const { profileKey } = doc.data();

        if (!profileKey) {
            return errorResponse(404, 'ProfileKey fehlt im Ayrshare-Profil');
        }

        console.log('ProfileKey gefunden:', profileKey.substring(0, 10) + '...');

        // JWT über Ayrshare API generieren
        const jwtResult = await generateJwt(profileKey);

        console.log('JWT URL generiert:', jwtResult.url);

        // Letzten JWT-Zeitstempel in Firebase aktualisieren
        await db.collection('ayrshare_profiles').doc(userId).update({
            lastJwtGenerated: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                linkUrl: jwtResult.url,
                expiresIn: jwtResult.expiresIn || 300
            })
        };

    } catch (error) {
        console.error('Fehler bei JWT-Generierung:', error);
        return errorResponse(500, 'Fehler bei JWT-Generierung', error.message);
    }
};

// Ayrshare JWT generieren
function generateJwt(profileKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            profileKey: profileKey,
            privateKey: AYRSHARE_PRIVATE_KEY,
            domain: 'id-ikr3B'
        });

        const options = {
            hostname: 'api.ayrshare.com',
            port: 443,
            path: '/api/profiles/generateJWT',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && response.url) {
                        resolve({
                            url: response.url,
                            expiresIn: response.expiresIn
                        });
                    } else {
                        reject(new Error(response.message || 'JWT-Generierung fehlgeschlagen'));
                    }
                } catch (error) {
                    reject(new Error('Ungültige API-Antwort'));
                }
            });
        });

        req.on('error', (error) => { reject(error); });
        req.write(postData);
        req.end();
    });
}

// Helper: CORS Headers
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
}

// Helper: Error Response
function errorResponse(statusCode, message, details = null) {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify({
            success: false,
            error: message,
            details: details
        })
    };
}
