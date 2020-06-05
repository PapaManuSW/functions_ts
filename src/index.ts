import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

const {CloudTasksClient} = require('@google-cloud/tasks');

interface ExpiringDocumentData extends admin.firestore.DocumentData {
    expiresIn?: number
    expiresAt?: admin.firestore.Timestamp
}

interface ExpirationTaskPayload {
    docPath: string
}

admin.initializeApp();

export const onCreatePost =
    functions.region("europe-west1").firestore.document('/posts/{id}').onCreate(async snapshot => {
        const data = snapshot.data()! as ExpiringDocumentData;
        const {expiresIn, expiresAt} = data;
        let expirationAtSeconds: number | undefined;
        if (expiresIn && expiresIn > 0) {
            expirationAtSeconds = Date.now() / 1000 + expiresIn
        } else if (expiresAt) {
            expirationAtSeconds = expiresAt.seconds
        }
        if (!expirationAtSeconds) {
            // No expiration set on this document
            return
        }
        // Get the project ID from the FIREBASE_CONFIG env var
        const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
        const location = 'europe-west1';
        const queue = 'firestore-ttl';
        const tasksClient = new CloudTasksClient();
        const queuePath: string =
            tasksClient.queuePath(project, location, queue);
        const url = `https://${location}-${project}.cloudfunctions.net/sendNotification`;
        const docPath = snapshot.ref.path;
        const payload: ExpirationTaskPayload = {docPath};
        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            scheduleTime: {
                seconds: expirationAtSeconds
            }
        };
        await tasksClient.createTask({parent: queuePath, task});
    });


export const firestoreTtlCallback =
    functions.region("europe-west1").https.onRequest(async (req, res) => {
        const payload = req.body as ExpirationTaskPayload;
        try {
            console.log("Deleting document...");
            await admin.firestore().doc(payload.docPath).delete();
            res.sendStatus(200)
        } catch (error) {
            console.error(error);
            res.status(500).send(error)
        }
    });

export const sendNotification =
    functions.region("europe-west1").https.onRequest(async (req, res) => {
        // This registration token comes from the client FCM SDKs.
        console.log("I am sending a fake notification.");
        var registrationToken = 'e6WCepJgaE8:APA91bHZ8yg5hU0rjAfo8Gy-qV6Zir1ivrcc6GBYccBFBdRXW8rN5uc3OmYBBJu6WxKHL4J_fTYrS6VrmwrKWHw1jfoAusOA5uxKRdYezsfhNXoNXLRaF7NIihwIFXhexRNlCxtj5_c5';
        // See the "Defining the message payload" section above for details
        // on how to define a message payload.
        var payload = {
            notification: {
                title: 'Yooooo!',
                body: 'Urgent action is needed to prevent your account from being disabled!'
            }
        };
//       // Set the message as high priority and have it expire after 24 hours.
        var options = {
            priority: 'high',
            timeToLive: 60 * 60 * 24
        };
//       // Send a message to the device corresponding to the provided
        // registration token with the provided options.
        admin.messaging().sendToDevice(registrationToken, payload, options)
            .then(function (response) {
                console.log('Successfully sent message:', response);
                res.sendStatus(200);
            })
            .catch(function (error) {
                console.log('Error sending message:', error);
                res.status(500).send(error);
            });
//       // You must return a Promise when performing asynchronous tasks inside a Functions such as
        // writing to the Firebase Realtime Database.
        // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
        // return snapshot.({'uppercase': uppercase});
    });