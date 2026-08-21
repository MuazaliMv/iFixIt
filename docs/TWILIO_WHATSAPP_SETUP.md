# FixIt — Twilio WhatsApp setup

FixIt can use Twilio as the WhatsApp transport while keeping the existing `/api/whatsapp/send` and `/api/whatsapp/event` endpoints.

## Railway variables

Set these on the FixIt Railway service:

```text
WHATSAPP_PROVIDER=TWILIO
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<Twilio auth token>
TWILIO_WHATSAPP_FROM=+14155238886
WHATSAPP_INTERNAL_TOKEN=<existing FixIt internal WhatsApp token>
```

For the Twilio Sandbox, `TWILIO_WHATSAPP_FROM` is the Twilio Sandbox sender shown in the Twilio Console. At the time this integration was implemented, Twilio documents the shared Sandbox sender as `+14155238886`; use the value displayed in your own Console if it differs.

Optional:

```text
TWILIO_STATUS_CALLBACK_URL=https://<fixit-domain>/api/whatsapp/twilio/status
```

Do not commit account credentials or auth tokens.

## Sandbox test

1. In the Twilio Console, open Messaging → Try it out → Send a WhatsApp message.
2. Activate the Sandbox.
3. From the recipient WhatsApp account, send the displayed `join <sandbox-code>` message to the Sandbox number.
4. This opens the customer-service window for that recipient.
5. Set the Railway variables above and redeploy.
6. Use the existing FixIt endpoint:

```http
POST /api/whatsapp/send
x-fixit-whatsapp-token: <WHATSAPP_INTERNAL_TOKEN>
Content-Type: application/json

{"to":"+9609999279","text":"welcome"}
```

A successful request returns the Twilio Message SID as `messageId`.

## Templates / ContentSid

For FixIt lifecycle events outside the 24-hour customer-service window, Twilio requires approved WhatsApp content/templates. The existing FixIt event variables remain in use, but when `WHATSAPP_PROVIDER=TWILIO`, each value must be a Twilio Content SID (`HX...`) rather than a Meta template name.

Example:

```text
WHATSAPP_TEMPLATE_REQUEST_RECEIVED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_TEMPLATE_PROVIDER_ACCEPTED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_TEMPLATE_WORK_COMPLETED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

FixIt converts the event parameters into Twilio `ContentVariables` automatically.
