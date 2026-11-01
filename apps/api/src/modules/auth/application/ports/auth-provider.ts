export interface AuthSession {
  sessionId: string;
  message?: string;
}

export interface SignInInput {
  login: string;
  password: string;
}

/**
 * Frontera de identidad (Authentico). Los casos de uso dependen de esta interfaz,
 * nunca del SDK concreto. El SDK actual (0.1.0) solo implementa `signIn`; la
 * validación de sesión (GetSessionInfo) y el menú se añadirán cuando el SDK los
 * exponga (ver plan de roles/guards).
 */
export abstract class AuthProvider {
  abstract signIn(input: SignInInput): Promise<AuthSession>;
}