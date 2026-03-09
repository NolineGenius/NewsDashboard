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
        let userId, limit;

        // Flexibles Parsen
        try {
            const outerBody = JSON.parse(event.body || '{}');
            if (outerBody.body) {
                const innerBody = JSON.parse(outerBody.body);
                userId = innerBody.userId;
                limit = innerBody.limit;
            } else {
                userId = outerBody.userId;
                limit = outerBody.limit;
            }
        } catch (error) {
            console.error('Fehler beim Parsen des Body:', error);
            return errorResponse(400, 'Ungültiges Body-Format');
        }

        if (!userId) {
            return errorResponse(400, 'User-ID fehlt');
        }

        limit = limit || 50;

        console.log('Feed abrufen für userId:', userId, '| Limit:', limit);

        // ProfileKey aus Firebase holen
        const doc = await db.collection('ayrshare_profiles').doc(userId).get();

        if (!doc.exists) {
            return errorResponse(404, 'Kein Ayrshare-Profil gefunden. Bitte zuerst LinkedIn verbinden.');
        }

        const { profileKey } = doc.data();

        if (!profileKey) {
            return errorResponse(404, 'ProfileKey fehlt im Ayrshare-Profil');
        }

        console.log('ProfileKey gefunden, rufe LinkedIn-Feed ab');

        // LinkedIn-Post-History über Ayrshare API abrufen
        const posts = await getLinkedInHistory(profileKey, limit);

        console.log('Feed abgerufen:', posts.length, 'Posts');

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                posts: posts
            })
        };

    } catch (error) {
        console.error('Fehler beim Feed-Abruf:', error);
        return errorResponse(500, 'Fehler beim Laden des LinkedIn-Feeds', error.message);
    }
};

// LinkedIn-Post-History über Ayrshare API abrufen
function getLinkedInHistory(profileKey, limit) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.ayrshare.com',
            port: 443,
            path: `/api/history/linkedin?limit=${limit}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Profile-Key': profileKey
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    console.log('Ayrshare History API status:', res.statusCode);
                    console.log('Ayrshare History API response (first 2000):', data.substring(0, 2000));
                    const response = JSON.parse(data);
                    if (res.statusCode === 200) {
                        const rawPosts = Array.isArray(response) ? response : (response.posts || []);
                        // Log first raw post for debugging
                        if (rawPosts.length > 0) {
                            console.log('First raw post keys:', Object.keys(rawPosts[0]));
                            console.log('First raw post:', JSON.stringify(rawPosts[0]).substring(0, 1000));
                        }
                        const normalizedPosts = rawPosts.map(normalizePost).filter(p => p !== null);
                        resolve(normalizedPosts);
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
        req.end();
    });
}

// LinkedIn-Post in einheitliches Format bringen
function normalizePost(raw) {
    // Versuche Text aus verschiedenen LinkedIn-Formaten zu extrahieren
    let content = '';

    // Ayrshare-normalisierte Felder
    if (raw.post) content = raw.post;
    else if (raw.text) content = raw.text;
    else if (raw.commentary) content = raw.commentary;
    // LinkedIn UGC Format
    else if (raw.specificContent) {
        const shareContent = raw.specificContent['com.linkedin.ugc.ShareContent'];
        if (shareContent?.shareCommentary?.text) {
            content = shareContent.shareCommentary.text;
        }
    }
    // LinkedIn Share Format
    else if (raw.message?.text) content = raw.message.text;
    // Fallback: content-Feld, aber nur wenn es kein URN ist
    else if (raw.content && typeof raw.content === 'string' && !raw.content.startsWith('urn:')) {
        content = raw.content;
    }

    // Datum extrahieren
    let created = '';
    if (raw.created?.time) {
        created = new Date(raw.created.time).toISOString();
    } else if (raw.createdAt) {
        created = raw.createdAt;
    } else if (raw.created && typeof raw.created === 'string') {
        created = raw.created;
    } else if (raw.lastModified?.time) {
        created = new Date(raw.lastModified.time).toISOString();
    }

    // ID extrahieren
    const id = raw.id || raw.ugcPostId || raw.postId || '';

    // Engagement-Daten extrahieren
    const likes = raw.likes ?? raw.numLikes ?? raw.socialMetadata?.totalLikes ?? undefined;
    const comments = raw.comments ?? raw.numComments ?? raw.socialMetadata?.totalComments ?? undefined;
    const shares = raw.shares ?? raw.numShares ?? raw.socialMetadata?.totalShares ?? undefined;

    // PostUrl extrahieren
    const postUrl = raw.postUrl || raw.url || '';

    return {
        id: id,
        content: content,
        created: created,
        likes: likes,
        comments: comments,
        shares: shares,
        postUrl: postUrl,
        mediaUrls: raw.mediaUrls || raw.images || []
    };
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
