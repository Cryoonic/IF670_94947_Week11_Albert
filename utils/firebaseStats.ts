export type FirebaseStats = {
  firestoreSuccess: number;
  firestoreFailed: number;
  fcmSuccess: number;
  fcmFailed: number;
};

export const firebaseStats: FirebaseStats = {
  firestoreSuccess: 0,
  firestoreFailed: 0,
  fcmSuccess: 0,
  fcmFailed: 0,
};

export function resetFirebaseStats() {
  firebaseStats.firestoreSuccess = 0;
  firebaseStats.firestoreFailed = 0;
  firebaseStats.fcmSuccess = 0;
  firebaseStats.fcmFailed = 0;
}
