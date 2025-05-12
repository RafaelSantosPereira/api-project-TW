// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0_jTfxwKbJ9_ncqCC2gFnm14Qwcek6X4",
  authDomain: "topcinema-tw.firebaseapp.com",
  projectId: "topcinema-tw",
  storageBucket: "topcinema-tw.firebasestorage.app",
  messagingSenderId: "756477789103",
  appId: "1:756477789103:web:6cda61b9a704273d5be55a",
  measurementId: "G-SMS3YSL43V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
