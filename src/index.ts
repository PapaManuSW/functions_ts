import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

//const {CloudTasksClient} = require('@google-cloud/tasks');
//interface ExpiringDocumentData extends admin.firestore.DocumentData {
//    expiresIn?: number
//    expiresAt?: admin.firestore.Timestamp
//}
//
//interface ExpirationTaskPayload {
//    docPath: string
//}
admin.initializeApp();
export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

//export const onCreatePost =
//    functions.region("europe-west1").firestore.document('/posts/{id}').onCreate(async snapshot => {
//        const data = snapshot.data()! as ExpiringDocumentData;
//        const {expiresIn, expiresAt} = data;
//        let expirationAtSeconds: number | undefined;
//        if (expiresIn && expiresIn > 0) {
//            expirationAtSeconds = Date.now() / 1000 + expiresIn
//        } else if (expiresAt) {
//            expirationAtSeconds = expiresAt.seconds
//        }
//        if (!expirationAtSeconds) {
//            // No expiration set on this document
//            return
//        }
//        // Get the project ID from the FIREBASE_CONFIG env var
//        const project = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
//        const location = 'europe-west1';
//        const queue = 'firestore-ttl';
//        const tasksClient = new CloudTasksClient();
//        const queuePath: string =
//            tasksClient.queuePath(project, location, queue);
//        const url = `https://${location}-${project}.cloudfunctions.net/firestoreTtlCallback`;
//        const docPath = snapshot.ref.path;
//        const payload: ExpirationTaskPayload = {docPath};
//        const task = {
//            httpRequest: {
//                httpMethod: 'POST',
//                url,
//                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
//                headers: {
//                    'Content-Type': 'application/json',
//                },
//            },
//            scheduleTime: {
//                seconds: expirationAtSeconds
//            }
//        };
//        await tasksClient.createTask({parent: queuePath, task});
//    });
//
//
//export const firestoreTtlCallback =
//    functions.region("europe-west1").https.onRequest(async (req, res) => {
//        const payload = req.body as ExpirationTaskPayload;
//        try {
//            console.log("Deleting document...");
//            await admin.firestore().doc(payload.docPath).delete();
//            res.send(200)
//        } catch (error) {
//            console.error(error);
//            res.status(500).send(error)
//        }
//    });
 // Start writing Firebase Functions
 // https://firebase.google.com/docs/functions/typescript

