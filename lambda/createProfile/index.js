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
const LAMBDA_JWT_URL = process.env.LAMBDA_JWT_URL;

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
        let userId, title;

        // Flexibles Parsen: Teste beide Formate
        try {
            const outerBody = JSON.parse(event.body || '{}');
            if (outerBody.body) {
                const innerBody = JSON.parse(outerBody.body);
                userId = innerBody.userId;
                title = innerBody.title;
            } else {
                userId = outerBody.userId;
                title = outerBody.title;
            }
        } catch (error) {
            console.error('Fehler beim Parsen des Body:', error);
            return errorResponse(400, 'Ungültiges Body-Format');
        }

        if (!userId) {
            return errorResponse(400, 'User-ID fehlt');
        }

        title = title || `User ${userId.substring(0, 8)}`;

        console.log('UserId:', userId, '| Titel:', title);

        // 1. Prüfe ob User bereits ein Profil hat
        const existingProfile = await db.collection('ayrshare_profiles').doc(userId).get();

        let profileData;
        let wasCreated = false;

        if (existingProfile.exists) {
            profileData = existingProfile.data();
            console.log('Profil existiert bereits:', profileData.profileKey);
        } else {
            // 2. Erstelle Ayrshare Profil
            const newProfileData = await createAyrshareProfile(title);

            console.log('Ayrshare Profil erstellt:', newProfileData.profileKey);

            // 3. Speichere in Firebase
            const profileDoc = {
                userId: userId,
                profileKey: newProfileData.profileKey,
                refId: newProfileData.refId,
                title: newProfileData.title,
                messagingActive: newProfileData.messagingActive || false,
                linkedPlatforms: [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('ayrshare_profiles').doc(userId).set(profileDoc);

            profileData = newProfileData;
            wasCreated = true;
            console.log('Profil in Firebase gespeichert');
        }

        // 4. JWT URL generieren
        console.log('Rufe JWT-Lambda auf für userId:', userId);
        const jwtResponse = await callGenerateJwt(userId);

        console.log('JWT URL erhalten:', jwtResponse.linkUrl);

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                message: wasCreated ? 'Profil erfolgreich erstellt' : 'Profil existiert bereits',
                profile: {
                    profileKey: profileData.profileKey,
                    refId: profileData.refId,
                    title: profileData.title
                },
                jwtUrl: jwtResponse.linkUrl,
                expiresIn: jwtResponse.expiresIn
            })
        };

    } catch (error) {
        console.error('Fehler beim Erstellen des Profils:', error);
        return errorResponse(500, 'Fehler beim Erstellen des Profils', error.message);
    }
};

// JWT-Lambda aufrufen
function callGenerateJwt(userId) {
    return new Promise((resolve, reject) => {
        const url = new URL(LAMBDA_JWT_URL);
        url.searchParams.append('userId', userId);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'JWT-Generierung fehlgeschlagen'));
                    }
                } catch (error) {
                    reject(new Error('Ungültige JWT-Lambda Antwort'));
                }
            });
        });

        req.on('error', (error) => { reject(error); });
        req.end();
    });
}

// Ayrshare Profil erstellen
function createAyrshareProfile(title) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ title });

        const options = {
            hostname: 'api.ayrshare.com',
            port: 443,
            path: '/api/profiles',
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
                    if (res.statusCode === 200 && response.profileKey) {
                        resolve({
                            profileKey: response.profileKey,
                            refId: response.refId,
                            title: response.title,
                            messagingActive: response.messagingActive
                        });
                    } else {
                        reject(new Error(response.message || 'Profilerstellung fehlgeschlagen'));
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
