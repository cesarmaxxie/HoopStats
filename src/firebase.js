import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Cole aqui as chaves do SEU projeto Firebase (Configurações do projeto > Geral > Seus apps > SDK).
// Essas chaves são feitas pra ficar públicas no código do front-end — quem protege os dados
// de verdade são as REGRAS do Firestore (arquivo firestore.rules), não o segredo dessas chaves.
const firebaseConfig = {
  apiKey: "AIzaSyAcj4spST3i5VRMNu6c5Wy5lGQsimcMQWg",
  authDomain: "hoopstats-a4f19.firebaseapp.com",
  projectId: "hoopstats-a4f19",
  storageBucket: "hoopstats-a4f19.firebasestorage.app",
  messagingSenderId: "348815649",
  appId: "1:348815649:web:6b79b9ce1f20f14d977e60",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
