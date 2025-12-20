# Tradovate API Integration Notes

## Authentication

Tradovate uses a credentials-based authentication system:

### Access Token Request
```bash
POST https://demo.tradovateapi.com/v1/auth/accesstokenrequest  # Demo
POST https://live.tradovateapi.com/v1/auth/accesstokenrequest  # Live

{
  "name": "username",
  "password": "password", 
  "appId": "Sample App",
  "appVersion": "1.0",
  "cid": 8,          
  "sec": "f03741b6-f634-48d6-9308-c8fb871150c2",
  "deviceId": "unique-device-id"
}
```

### Using Access Token
```
Authorization: Bearer <access_token>
```

## API Endpoints

- **Demo**: `https://demo.tradovateapi.com/v1/`
- **Live**: `https://live.tradovateapi.com/v1/`

## Key Endpoints

- `/account/list` - Get user accounts
- `/order/placeorder` - Place orders
- `/position/list` - Get positions
- `/contract/find` - Find contracts

## User Flow for Integration

1. User enters Tradovate credentials (username/password)
2. We request access token from Tradovate API
3. Store encrypted credentials/token in database
4. Use token for order placement when webhook signals arrive

## Security Considerations

- Store credentials encrypted (AES-256)
- Tokens expire - need refresh mechanism
- Use demo environment for testing
- Never log credentials
