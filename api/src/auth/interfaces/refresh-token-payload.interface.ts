export interface RefreshTokenPayload {
  sub: number;
  tokenId: string;
  tokenType: 'refresh';
}
