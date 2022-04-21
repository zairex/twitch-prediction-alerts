# twitch-prediction-alerts

Custom alerts for Twitch prediction events.

This repository consists of the implementation for Firebase [Cloud Functions](https://firebase.google.com/docs/functions) that are connected to a custom [Firestore](https://firebase.google.com/docs/firestore) database instance. This specific database is populated with an external pubsub client listening to Twitch prediction events as they are published.

At the moment, this instance is set to monitor the events of a single Twitch channel, but could be expanded to subscribe to more. Additionally, the code here could be used to spin up a separate instance, although the pubsub client code is not public at the moment. Please contact zairex#7676 on Discord for more information.
