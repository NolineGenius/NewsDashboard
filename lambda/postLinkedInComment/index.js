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
        let userId, postId, comment, searchPlatformId;

        // Flexibles Parsen
        try {
            const outerBody = JSON.parse(event.body || '{}');
            if (outerBody.body) {
                const innerBody = JSON.parse(outerBody.body);
                userId = innerBody.userId;
                postId = innerBody.postId;
                comment = innerBody.comment;
                searchPlatformId = innerBody.searchPlatformId;
            } else {
                userId = outerBody.userId;
                postId = outerBody.postId;
                comment = outerBody.comment;
                searchPlatformId = outerBody.searchPlatformId;
            }
        } catch (error) {
            console.error('Fehler beim Parsen des Body:', error);
            return errorResponse(400, 'Ungültiges Body-Format');
        }

        if (!userId) {
            return errorResponse(400, 'User-ID fehlt');
        }

        if (!postId) {
            return errorResponse(400, 'Post-ID fehlt');
        }

        if (!comment) {
            return errorResponse(400, 'Kommentar fehlt');
        }

        console.log('Kommentar posten für userId:', userId, '| postId:', postId);

        // ProfileKey aus Firebase holen
        const doc = await db.collection('ayrshare_profiles').doc(userId).get();

        if (!doc.exists) {
            return errorResponse(404, 'Kein Ayrshare-Profil gefunden. Bitte zuerst LinkedIn verbinden.');
        }

        const { profileKey } = doc.data();

        if (!profileKey) {
            return errorResponse(404, 'ProfileKey fehlt im Ayrshare-Profil');
        }

        console.log('ProfileKey gefunden, poste Kommentar');

        // Kommentar über Ayrshare API posten
        const result = await postComment(postId, comment, profileKey, searchPlatformId);

        console.log('Kommentar erfolgreich gepostet');

        // Kommentar-Log in Firebase speichern
        await db.collection('ayrshare_comment_logs').add({
            userId: userId,
            profileKey: profileKey,
            postId: postId,
            comment: comment.substring(0, 500),
            ayrshareCommentId: result.commentID || '',
            status: 'posted',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                message: 'Kommentar erfolgreich gepostet',
                commentId: result.commentID || ''
            })
        };

    } catch (error) {
        console.error('Fehler beim Kommentar-Posting:', error);
        return errorResponse(500, 'Fehler beim Posten des Kommentars', error.message);
    }
};

// Kommentar über Ayrshare API posten
function postComment(postId, comment, profileKey, searchPlatformId) {
    return new Promise((resolve, reject) => {
        const payload = {
            id: postId,
            comment: comment,
            platforms: ['linkedin'],
            profileKey: profileKey
        };

        if (searchPlatformId) {
            payload.searchPlatformId = true;
        }

        const postData = JSON.stringify(payload);

        const options = {
            hostname: 'api.ayrshare.com',
            port: 443,
            path: '/api/comments',
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
                    console.log('Ayrshare Comments API status:', res.statusCode);
                    console.log('Ayrshare Comments API response:', data.substring(0, 500));
                    const response = JSON.parse(data);
                    // Ayrshare returns an array of results (one per platform)
                    const result = Array.isArray(response) ? response[0] : response;
                    const linkedinResult = result?.linkedin || result;
                    if (res.statusCode === 200 && (linkedinResult?.status === 'success' || result?.commentId || result?.commentID)) {
                        resolve({ ...result, commentID: result.commentId || result.commentID || linkedinResult?.commentId || '' });
                    } else {
                        const errorMsg = linkedinResult?.message || result?.message || result?.error || JSON.stringify(response).substring(0, 200);
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
