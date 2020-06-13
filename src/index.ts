import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
//import * as field from "./firestore-field-filter";

const {CloudTasksClient} = require('@google-cloud/tasks');

//interface UserData extends admin.firestore.DocumentData {
//    longestStreak?: number
//    nextClickAt?: string
//    streak?: number
//}

interface ScheduleNotificationPayload {
    userId: string
}

interface NotificationDataPayload {
    registrationToken: string
    streak: string
}

admin.initializeApp();

export const scheduleTaskToSendNotification =
    functions.region("europe-west1").https.onRequest(async (req, res) => {
        // Fetch userId from http payload
        const httpPayload = req.body as ScheduleNotificationPayload;
        console.log("Received request to schedule notification for user: " + httpPayload.userId);

        // Fetch registration token and notification interval from database
        const userDataSnapshot = await admin.firestore().collection("/" + httpPayload.userId).doc("userData").get();
        const registrationToken = userDataSnapshot.get("registrationToken");
        const notificationInterval = userDataSnapshot.get("notificationInterval");
        console.log("Notification interval is: " + notificationInterval);

        // Calculate when to send the notification
        let sendAtSecond: number | undefined;
        if (notificationInterval && notificationInterval > 0) {
            sendAtSecond = Date.now() / 1000 + notificationInterval;
        }
        if (!sendAtSecond) {
            console.log("SendAtSecond undefined: " + sendAtSecond);
            return;

        }

        // Get the current streak
        const gameDataSnapshot = await admin.firestore().collection(httpPayload.userId).doc("gameData").get();
        const streak = gameDataSnapshot.get("streak");
        console.log("Streak is: " + streak);

        // Get the project ID from the FIREBASE_CONFIG env var and create payload
        const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
        const location = 'europe-west1';
        const queue = 'notificationsQueue';
        const tasksClient = new CloudTasksClient();
        const queuePath: string =
            tasksClient.queuePath(project, "europe-west3", queue);
        const url = `https://${location}-${project}.cloudfunctions.net/sendNotification`;
        const payload: NotificationDataPayload = {registrationToken, streak}

        // Set up task
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
        // Send task to scheduler
        await tasksClient.createTask({parent: queuePath, task});
        res.sendStatus(200);
    });


export const sendNotification =
    functions.region("europe-west1").https.onRequest(async (req, res) => {
        const httpPayload = req.body as NotificationDataPayload;

        // Extract data from payload
        let registrationToken = httpPayload.registrationToken;
        let streak = httpPayload.streak;

        let payload = {
            notification: {
                title: 'Hey, pssst!',
                body: `Keep up the ${streak} days streak, press the button!`
            }
        };

        // Set the message as high priority and have it expire after 24 hours.
        let options = {
            priority: 'high',
            timeToLive: 60 * 60 * 24
        };
        // Send a message to the device corresponding to the provided
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
        // You must return a Promise when performing asynchronous tasks inside a Functions such as
        // writing to the Firebase Realtime Database.
        // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
        // return snapshot.({'uppercase': uppercase});
    });
// Look for changes in "streak" field of any user. If there is a change, schedule a notification in google tasks.
// The notification is sent to the gameData/registrationToken after gameData/notificationInterval seconds.
//export const onUpdateUserData =
//    functions.region("europe-west1").firestore.document('/{user}/userData')
//        .onUpdate(field.default('streak', 'CHANGED', async (change: any, context: any) => {
//            const data = change.after.data()! as UserData;
//            console.log("Data changed for user: " + context.params.user);
//
//            const documentSnapshot = await admin.firestore().collection(context.params.user).doc("gameData").get();
//            const registrationToken = documentSnapshot.get("registrationToken");
//            const notificationInterval = documentSnapshot.get("notificationInterval");
//
//            let sendAtSecond: number | undefined;
//            if (notificationInterval && notificationInterval > 0) {
//                sendAtSecond = Date.now() / 1000 + notificationInterval;
//            }
//            if (!sendAtSecond) {
//                console.log("SendAtSecond undefined: " + sendAtSecond);
//                return;
//            }
//            console.log("Streak is: " + data?.streak);
//            console.log("Notification interval is: " + notificationInterval);
//            // Get the project ID from the FIREBASE_CONFIG env var
//            const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
//            const location = 'europe-west1';
//            const queue = 'notificationsQueue';
//            const tasksClient = new CloudTasksClient();
//            const queuePath: string =
//                tasksClient.queuePath(project, "europe-west3", queue);
//            const url = `https://${location}-${project}.cloudfunctions.net/sendNotification`;
//            const payload: NotificationDataPayload = {registrationToken}
//
//            const task = {
//                httpRequest: {
//                    httpMethod: 'POST',
//                    url,
//                    body: Buffer.from(JSON.stringify(payload)).toString('base64'),
//                    headers: {
//                        'Content-Type': 'application/json',
//                    },
//                },
//                scheduleTime: {
//                    seconds: sendAtSecond
//                }
//            };
//            await tasksClient.createTask({parent: queuePath, task});
//        }));

