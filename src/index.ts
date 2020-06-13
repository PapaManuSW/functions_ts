import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as field from "./firestore-field-filter";

const {CloudTasksClient} = require('@google-cloud/tasks');

interface UserData extends admin.firestore.DocumentData {
    longestStreak?: number
    nextClickAt?: string
    streak?: number
}

//interface ExpirationTaskPayload {
//    docPath: string
//}
//
interface RegistrationTokenPayload {
    registrationToken: string
}

admin.initializeApp();

// Look for changes in "streak" field of any user. If there is a change, schedule a notification in google tasks.
// The notification is sent to the gameData/registrationToken after gameData/notificationInterval seconds.
export const onUpdateUserData =
    functions.region("europe-west1").firestore.document('/{user}/userData')
        .onUpdate(field.default('streak', 'CHANGED', async (change: any, context: any) => {
            const data = change.after.data()! as UserData;
            console.log("Data changed for user: " + context.params.user);

            const documentSnapshot = await admin.firestore().collection(context.params.user).doc("gameData").get();
            const registrationToken = documentSnapshot.get("registrationToken");
            const notificationInterval = documentSnapshot.get("notificationInterval");

            let sendAtSecond: number | undefined;
            if (notificationInterval && notificationInterval > 0) {
                sendAtSecond = Date.now() / 1000 + notificationInterval;
            }
            if (!sendAtSecond) {
                console.log("SendAtSecond undefined: " + sendAtSecond);
                return;
            }
            console.log("Streak is: " + data?.streak);
            console.log("Notification interval is: " + notificationInterval);
            // Get the project ID from the FIREBASE_CONFIG env var
            const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
            const location = 'europe-west1';
            const queue = 'notificationsQueue';
            const tasksClient = new CloudTasksClient();
            const queuePath: string =
                tasksClient.queuePath(project, "europe-west3", queue);
            const url = `https://${location}-${project}.cloudfunctions.net/sendNotification`;
            const payload: RegistrationTokenPayload = {registrationToken}

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
        // See the "Defining the message payload" section above for details
        // on how to define a message payload.

        let payload = {
            notification: {
                title: 'Hi!',
                body: 'It is time to press the button, don\'t miss it!'
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