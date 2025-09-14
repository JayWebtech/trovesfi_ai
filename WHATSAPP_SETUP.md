# WhatsApp Cloud API Setup Guide

This guide will help you set up the WhatsApp Cloud API for the Troves.fi AI Assistant using the official [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/overview).

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Meta Developer Account** - [Create one here](https://developers.facebook.com/)
3. **Meta Business Account** - [Create one here](https://business.facebook.com/)
4. **WhatsApp Business Account** (will be created during setup)
5. **Public HTTPS endpoint** for webhooks (use ngrok for development)

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** and then **"Create App"**
3. Select **"Business"** as the app type
4. Fill in your app details:
   - **App Name**: `Troves.fi AI Assistant`
   - **App Contact Email**: Your email
   - **Business Account**: Select your business account
5. Click **"Create App"**

## Step 2: Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"** in the products list
2. Click **"Set up"** on the WhatsApp product
3. You'll be redirected to the WhatsApp setup flow

## Step 3: Create WhatsApp Business Account

1. Follow the **"Get Started"** process in the WhatsApp setup
2. You'll be prompted to create a **WhatsApp Business Account (WABA)**
3. Fill in your business details:
   - **Business Name**: `Troves.fi`
   - **Business Category**: Select appropriate category
   - **Business Description**: Brief description of your business
4. Complete the business verification process

## Step 4: Get Your Phone Number

1. In the WhatsApp setup, you'll get a **test phone number** initially
2. For production, you can add your own phone number:
   - Go to **WhatsApp Manager** > **Phone Numbers**
   - Click **"Add Phone Number"**
   - Follow the verification process

## Step 5: Get API Credentials

After completing the setup, you'll need these credentials:

### Access Token
1. Go to **App Dashboard** > **WhatsApp** > **API Setup**
2. Copy the **Temporary Access Token** (for testing)
3. For production, create a **System User Access Token**:
   - Go to **Business Settings** > **System Users**
   - Create a system user and generate a token

### Phone Number ID
1. In **WhatsApp Manager** > **API Setup**
2. Copy the **Phone Number ID** (starts with numbers)

### Business Account ID
1. In **WhatsApp Manager** > **API Setup**
2. Copy the **WhatsApp Business Account ID** (starts with numbers)

### Webhook Verify Token
1. Create a random string (e.g., `trovesfi_webhook_verify_2024`)
2. You'll use this to verify webhook requests

## Step 6: Configure Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your-access-token-here
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id-here
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id-here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token-here
WHATSAPP_API_VERSION=v17.0
```

## Step 7: Set Up Webhooks (Development)

For development, use ngrok to create a public HTTPS endpoint:

1. **Install ngrok**: [Download here](https://ngrok.com/download)
2. **Start your application**:
   ```bash
   npm run dev
   ```
3. **In another terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```
4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

## Step 8: Configure Webhooks in Meta

1. Go to **App Dashboard** > **WhatsApp** > **Configuration**
2. In the **Webhook** section:
   - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`
   - **Verify Token**: The token you created in Step 5
3. Click **"Verify and Save"**
4. Subscribe to these webhook fields:
   - `messages`
   - `message_deliveries`
   - `message_reads`

## Step 9: Test the Integration

1. **Start your application**:
   ```bash
   npm run dev
   ```

2. **Send a test message** to your WhatsApp Business number:
   - Use `/start` to get the welcome message
   - Try `/help` to see available commands
   - Ask a natural language question about Troves.fi

3. **Check the logs** to ensure messages are being processed

## Features

The WhatsApp bot supports all the same commands as the Telegram bot:

- `/start` - Welcome message and introduction
- `/help` - Get help and available commands
- `/status` - Get current contract status for all vaults
- `/balance <address> [vault_type]` - Check user balance
- Natural language queries about Troves.fi

## Production Deployment

### 1. Use Production Credentials
- Replace temporary access token with **System User Access Token**
- Use your own verified phone number
- Set up proper webhook URL (not ngrok)

### 2. Webhook Security
- Use HTTPS endpoints only
- Implement proper webhook verification
- Add rate limiting and error handling

### 3. Rate Limits
According to the [Cloud API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/overview):
- **Default throughput**: 80 messages per second
- **Upgraded throughput**: Up to 1,000 messages per second (automatic)
- **Pair rate limit**: 1 message every 6 seconds to the same user
- **Burst limit**: Up to 45 messages in 6 seconds

### 4. Message Templates
For production, you may want to use **Message Templates** for:
- Welcome messages
- Status updates
- Error notifications

Templates must be approved by Meta before use.

## Troubleshooting

### Common Issues

1. **Webhook verification fails**:
   - Check that your webhook URL is accessible
   - Verify the webhook verify token matches
   - Ensure you're using HTTPS

2. **Messages not sending**:
   - Check your access token is valid
   - Verify phone number ID is correct
   - Check rate limits

3. **Webhook not receiving messages**:
   - Ensure webhook is properly configured in Meta
   - Check that you've subscribed to the right webhook fields
   - Verify your server is accessible from the internet

### Debugging

1. **Check webhook logs**:
   ```bash
   # Your application logs will show webhook requests
   npm run dev
   ```

2. **Test webhook manually**:
   ```bash
   curl -X GET "https://your-domain.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=your-token&hub.challenge=test"
   ```

3. **Use Meta's webhook testing tool**:
   - Go to **App Dashboard** > **WhatsApp** > **Configuration**
   - Use the **"Test"** button in the webhook section

## Security Best Practices

1. **Keep credentials secure**:
   - Never commit access tokens to version control
   - Use environment variables for all sensitive data
   - Rotate access tokens regularly

2. **Webhook security**:
   - Always verify webhook signatures
   - Use HTTPS endpoints only
   - Implement proper error handling

3. **Rate limiting**:
   - Respect WhatsApp's rate limits
   - Implement exponential backoff for retries
   - Monitor your usage

## Support and Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/overview)
- [WhatsApp Business Platform](https://business.whatsapp.com/)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Manager](https://business.facebook.com/wa/manage/)

## Next Steps

Once your WhatsApp integration is working:

1. **Monitor usage** and performance
2. **Set up proper logging** and monitoring
3. **Consider implementing message templates** for better user experience
4. **Add analytics** to track user engagement
5. **Scale up** to higher throughput if needed