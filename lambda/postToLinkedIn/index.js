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
        let userId, content, platforms, mediaUrls;

        // Flexibles Parsen
        try {
            const outerBody = JSON.parse(event.body || '{}');
            if (outerBody.body) {
                const innerBody = JSON.parse(outerBody.body);
                userId = innerBody.userId;
                content = innerBody.content;
                platforms = innerBody.platforms;
                mediaUrls = innerBody.mediaUrls;
            } else {
                userId = outerBody.userId;
                content = outerBody.content;
                platforms = outerBody.platforms;
                mediaUrls = outerBody.mediaUrls;
            }
        } catch (error) {
            console.error('Fehler beim Parsen des Body:', error);
            return errorResponse(400, 'Ungültiges Body-Format');
        }

        if (!userId) {
            return errorResponse(400, 'User-ID fehlt');
        }

        if (!content) {
            return errorResponse(400, 'Post-Inhalt fehlt');
        }

        platforms = platforms || ['linkedin'];

        console.log('Posting für userId:', userId, '| Plattformen:', platforms.join(', '));

        // ProfileKey aus Firebase holen
        const doc = await db.collection('ayrshare_profiles').doc(userId).get();

        if (!doc.exists) {
            return errorResponse(404, 'Kein Ayrshare-Profil gefunden. Bitte zuerst LinkedIn verbinden.');
        }

        const { profileKey } = doc.data();

        if (!profileKey) {
            return errorResponse(404, 'ProfileKey fehlt im Ayrshare-Profil');
        }

        console.log('ProfileKey gefunden, poste auf:', platforms.join(', '));

        // Über Ayrshare API posten
        const postResult = await postToSocial(content, platforms, profileKey, mediaUrls);

        console.log('Post erfolgreich:', postResult.id);

        // Post-Log in Firebase speichern
        await db.collection('ayrshare_post_logs').add({
            userId: userId,
            profileKey: profileKey,
            content: content.substring(0, 200),
            mediaUrls: mediaUrls || [],
            platforms: platforms,
            ayrsharePostId: postResult.id || '',
            postUrl: postResult.postUrl || '',
            status: 'posted',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                message: 'Erfolgreich gepostet',
                postId: postResult.id,
                postUrl: postResult.postUrl || ''
            })
        };

    } catch (error) {
        console.error('Fehler beim Posten:', error);
        return errorResponse(500, 'Fehler beim Posten auf LinkedIn', error.message);
    }
};

// Über Ayrshare API posten
function postToSocial(content, platforms, profileKey, mediaUrls) {
    return new Promise((resolve, reject) => {
        const payload = {
            post: content,
            platforms: platforms,
            profileKey: profileKey
        };

        if (mediaUrls && mediaUrls.length > 0) {
            payload.mediaUrls = mediaUrls;
        }

        const postData = JSON.stringify(payload);

        const options = {
            hostname: 'api.ayrshare.com',
            port: 443,
            path: '/api/post',
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
                    console.log('Ayrshare API status:', res.statusCode);
                    console.log('Ayrshare API response:', data.substring(0, 500));
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && (response.id || response.status === 'success')) {
                        resolve({
                            id: response.id,
                            postUrl: response.postUrl || response.postIds?.[0]?.postUrl || ''
                        });
                    } else {
                        const errorMsg = response.message || response.error || JSON.stringify(response).substring(0, 200);
                        reject(new Error(errorMsg));
                    }
                } catch (error) {
                    reject(new Error('Ungültige API-Antwort: ' + data.substring(0, 200)));
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
