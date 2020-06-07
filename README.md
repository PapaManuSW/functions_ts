# function_ts
[THIS IS THE NEW REPOSITORY]
During development it is not advisable to test the functions by deploying them at every little change. Rather one should test them locally and, when satisfied try with a real deployment on Firebase.

## Running the functions locally [WIP]
### Installation
Follow this link https://firebase.google.com/docs/functions/local-emulator and:

### Install the CLI tools
- Set up the Admin credentials
- Running "firebase init emulators" in the root of the repo you can choose what services (Firestore, Functions, Hosting...) you want and how to configure them (e.g. ports). Maybe you don't need to do it IF it is repo related. More info at: https://firebase.google.com/docs/emulator-suite/install_and_configure

### Running the functions
- Export variable (or set in WIndows/Linux): export FIRESTORE_EMULATOR_HOST=localhost:8080
- Start the emulator for Firestore and Functions (spaces are important): firebase emulators:start --only firestore,functions
- Trigger the execution of a function from browser with a link following this format: http://localhost:5001/button-app-2/europe-west1/addMessage?text=aRandomText. Please note that in the link you need to specify: localhost/appId/region/functionName. This link is fairly different from the link you would use when deployed in an actual Firebase instance: e.g. https://us-central1-.cloudfunctions.net/widgets/.


__Important in the code__
` var serviceAccount = require("../button-app-2-6ac1c850c51b.json"); //File for admin credentials to e.g. send notification. Obtain through setting up admin credentials (see above) `

` admin.initializeApp( { credential: admin.credential.cert(serviceAccount), // to be able to send notification. databaseURL: "http://localhost:8080"// to point to the emulated database} ); `

# PENDING to be solved
Now the firestore db is initialized with an "uglyHackForDemo" written in the code for the functions. We need to find a better way.
