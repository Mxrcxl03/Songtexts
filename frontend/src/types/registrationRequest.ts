export type RegistrationRequestStatus = 'PENDING' | 'APPROVED';

export type RegistrationRequest = {
  id: number;
  username: string;
  email: string;
  requestedAt: string;
  status: RegistrationRequestStatus;
  approvedAt: string | null;
  approvedBy: string | null;
};
