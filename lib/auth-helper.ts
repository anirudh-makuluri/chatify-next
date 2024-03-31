import firebase from "firebase/compat/app";
import "firebase/compat/auth"
import { config } from "@/lib/config";


firebase.initializeApp(config.firebaseConfig)
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" })

export const signIn = () => auth.signInWithPopup(provider);
export const signOut = () => auth.signOut();