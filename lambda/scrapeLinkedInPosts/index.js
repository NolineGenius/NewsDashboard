const https = require('https');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Firebase initialisieren
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'serviceAccount.json'), 'utf8')
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

exports.handler = async (event) => {
    // CORS Preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders(), body: '' };
    }

    try {
        let profileId, channelId, channelName, linkedinProfileUrl, maxPosts;

        // Flexibles Body-Parsen (wie andere Lambdas)
        try {
            const outerBody = JSON.parse(event.body || '{}');
            if (outerBody.body) {
                const innerBody = JSON.parse(outerBody.body);
                profileId = innerBody.profileId;
                channelId = innerBody.channelId;
                channelName = innerBody.channelName;
                linkedinProfileUrl = innerBody.linkedinProfileUrl;
                maxPosts = innerBody.maxPosts;
            } else {
                profileId = outerBody.profileId;
                channelId = outerBody.channelId;
                channelName = outerBody.channelName;
                linkedinProfileUrl = outerBody.linkedinProfileUrl;
                maxPosts = outerBody.maxPosts;
            }
        } catch (error) {
            console.error('Body parse error:', error);
            return errorResponse(400, 'Ungültiges Body-Format');
        }

        if (!profileId || !channelId || !linkedinProfileUrl) {
            return errorResponse(400, 'profileId, channelId und linkedinProfileUrl sind erforderlich');
        }

        maxPosts = maxPosts || 10;

        console.log('Scraping posts from:', linkedinProfileUrl, '| Channel:', channelName, '| Max:', maxPosts);

        // Apify Actor synchron aufrufen
        const scrapedPosts = await callApifyActor(linkedinProfileUrl, maxPosts);
        console.log('Apify returned', scrapedPosts.length, 'posts');

        if (scrapedPosts.length > 0) {
            console.log('First scraped post keys:', Object.keys(scrapedPosts[0]));
            console.log('First scraped post (preview):', JSON.stringify(scrapedPosts[0]).substring(0, 800));
        }

        // Bestehende Posts laden (Duplikat-Prüfung via LinkedIn-URL)
        const existingSnapshot = await db.collection('channel_posts')
            .where('channelId', '==', channelId)
            .get();

        const existingUrls = new Set(
            existingSnapshot.docs
                .map(doc => doc.data().linkedinUrl)
                .filter(Boolean)
        );

        console.log('Existing posts for channel:', existingUrls.size);

        // Neue Posts in Firestore speichern
        const now = new Date().toISOString();
        let newCount = 0;
        const batch = db.batch();

        for (const post of scrapedPosts) {
            const postUrl = post.linkedinUrl || post.url || '';

            // Duplikat überspringen
            if (postUrl && existingUrls.has(postUrl)) continue;

            // Post-Text extrahieren
            const content = post.content || post.text || post.commentary || '';
            if (!content) continue;

            // LinkedIn Post-ID aus URL extrahieren
            let linkedinPostId = '';
            if (postUrl) {
                const urnMatch = postUrl.match(/urn:li:(?:activity|ugcPost|share):(\d+)/);
                if (urnMatch) {
                    linkedinPostId = urnMatch[0];
                } else {
                    const activityMatch = postUrl.match(/activity[:\-/](\d+)/);
                    if (activityMatch) {
                        linkedinPostId = `urn:li:activity:${activityMatch[1]}`;
                    }
                }
            }

            // Engagement-Daten extrahieren
            const engagement = post.engagement || {};
            const likes = engagement.likes ?? engagement.numLikes ?? post.likes ?? null;
            const comments = engagement.comments ?? engagement.numComments ?? post.comments ?? null;
            const shares = engagement.shares ?? engagement.numShares ?? post.shares ?? null;

            // Autor extrahieren
            const authorName = post.author?.name
                || post.authorName
                || channelName
                || 'Unbekannt';

            // Datum extrahieren und normalisieren
            // Apify kann verschachtelte Objekte liefern: { timestamp, date: "ISO", postedAgoShort }
            let rawDate = post.postedAt || post.publishedAt || post.createdAt || post.date || now;
            if (rawDate && typeof rawDate === 'object' && rawDate.date) {
                rawDate = rawDate.date; // ISO string aus Apify-Objekt extrahieren
            } else if (rawDate && typeof rawDate === 'object' && rawDate.timestamp) {
                rawDate = new Date(rawDate.timestamp).toISOString();
            }
            const date = normalizeDate(rawDate, now);

            const postData = {
                profileId,
                channelId,
                channelName: channelName || '',
                content,
                authorName,
                linkedinUrl: postUrl,
                linkedinPostId,
                likes,
                comments,
                shares,
                date,
                createdAt: now,
            };

            const docRef = db.collection('channel_posts').doc();
            batch.set(docRef, postData);
            newCount++;
        }

        if (newCount > 0) {
            await batch.commit();
            console.log('Saved', newCount, 'new posts to Firestore');
        } else {
            console.log('No new posts to save');
        }

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                success: true,
                newPosts: newCount,
                totalScraped: scrapedPosts.length,
            })
        };

    } catch (error) {
        console.error('Scraping error:', error);
        return errorResponse(500, 'Fehler beim Scrapen der LinkedIn-Posts', error.message);
    }
};

// Apify Actor synchron aufrufen (wartet auf Ergebnis)
function callApifyActor(profileUrl, maxPosts) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            targetUrls: [profileUrl],
            maxPosts: maxPosts,
        });

        const options = {
            hostname: 'api.apify.com',
            port: 443,
            path: '/v2/acts/harvestapi~linkedin-profile-posts/run-sync-get-dataset-items',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${APIFY_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    console.log('Apify API status:', res.statusCode);
                    console.log('Apify response (first 1000):', data.substring(0, 1000));

                    if (res.statusCode === 200 || res.statusCode === 201) {
                        const result = JSON.parse(data);
                        resolve(Array.isArray(result) ? result : []);
                    } else {
                        reject(new Error(`Apify API Fehler (${res.statusCode}): ${data.substring(0, 300)}`));
                    }
                } catch (e) {
                    reject(new Error('Ungültige Apify-Antwort: ' + data.substring(0, 300)));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Apify API Timeout (120s)'));
        });
        req.write(payload);
        req.end();
    });
}

// Normalize various date formats to ISO string
function normalizeDate(value, fallback) {
    if (!value) return fallback;
    // Already a valid ISO string
    if (typeof value === 'string') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toISOString();
        // Try parsing Unix timestamp as string
        const num = Number(value);
        if (!isNaN(num) && num > 0) {
            // Seconds vs milliseconds: if < 10 billion, it's seconds
            const ms = num < 1e10 ? num * 1000 : num;
            const d2 = new Date(ms);
            if (!isNaN(d2.getTime())) return d2.toISOString();
        }
        return fallback;
    }
    // Unix timestamp as number
    if (typeof value === 'number' && value > 0) {
        const ms = value < 1e10 ? value * 1000 : value;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) return d.toISOString();
        return fallback;
    }
    // Firestore Timestamp or Date object
    if (value.toDate) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return fallback;
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
}

function errorResponse(statusCode, message, details = null) {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: message, details })
    };
}
