import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBEINHIOdfcGJGFf2G6oQen6m9dykwHzwE',
    authDomain: 'siraguwings-8321f.firebaseapp.com',
    projectId: 'siraguwings-8321f',
    storageBucket: 'siraguwings-8321f.firebasestorage.app',
    messagingSenderId: '539707324641',
    appId: '1:539707324641:web:62b7084871b1fa01501fa0',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBEINHIOdfcGJGFf2G6oQen6m9dykwHzwE',
    appId: '1:539707324641:android:d2b3e9c4f5ec1e03501fa0',
    messagingSenderId: '539707324641',
    projectId: 'siraguwings-8321f',
    storageBucket: 'siraguwings-8321f.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBEINHIOdfcGJGFf2G6oQen6m9dykwHzwE',
    appId: '1:539707324641:ios:314236656f51866c501fa0',
    messagingSenderId: '539707324641',
    projectId: 'siraguwings-8321f',
    storageBucket: 'siraguwings-8321f.firebasestorage.app',
    iosClientId: '539707324641-ios.apps.googleusercontent.com',
    iosBundleId: 'com.siragutech.siraguwingsMobile',
  );
}
