import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as field from "./firestore-field-filter";

const {CloudTasksClient} = require('@google-cloud/tasks');

interface DocumentData extends admin.firestore.DocumentData {
    sendIn?: number
    registrationToken?: string
}

interface ExpirationTaskPayload {
    docPath: string
}

interface RegistrationTokenPayload {
    registrationToken: string
}

admin.initializeApp();

export const onUpdateUserData =
    functions.region("europe-west1").firestore.document('/users/{id}')
        .onUpdate(field.default('numberOfHit', 'CHANGED', async (change: any, context: any) => {
            const data = change.after.data()! as DocumentData;
            const {sendIn, registrationToken} = data;
            if (sendIn == undefined) {
                console.log("sendIn is undefined: " + sendIn);
                return;// throw error
            }

            if (registrationToken == undefined) {
                console.log("Registration token is undefined: " + registrationToken);
                return;// throw error
            }

            let sendAtSecond: number | undefined;
            if (sendIn && sendIn > 0) {
                sendAtSecond = Date.now() / 1000 + sendIn
            }
            if (!sendAtSecond) {
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
            const payload: RegistrationTokenPayload = {registrationToken};

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
                    seconds: sendAtSecond
                }
            };
            await tasksClient.createTask({parent: queuePath, task});
        }));


export const sendNotification =
    functions.region("europe-west1").https.onRequest(async (req, res) => {
        const httpPayload = req.body as RegistrationTokenPayload;
        // This registration token comes from the client FCM SDKs.
        console.log("I am sending a notification.");
        let registrationToken = httpPayload.registrationToken;
        //var registrationToken = 'e6WCepJgaE8:APA91bHZ8yg5hU0rjAfo8Gy-qV6Zir1ivrcc6GBYccBFBdRXW8rN5uc3OmYBBJu6WxKHL4J_fTYrS6VrmwrKWHw1jfoAusOA5uxKRdYezsfhNXoNXLRaF7NIihwIFXhexRNlCxtj5_c5';
        // See the "Defining the message payload" section above for details
        // on how to define a message payload.

        let payload = {
            notification: {
                title: 'Yooooo!',
                body: 'Urgent action is needed to prevent your account from being disabled!'
            }
        };
//       // Set the message as high priority and have it expire after 24 hours.
        let options = {
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
