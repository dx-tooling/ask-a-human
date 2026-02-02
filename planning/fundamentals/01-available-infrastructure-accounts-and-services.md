AWS region is us-west-1.

AWS IAM account is 343194324802 (mercury-org-iam).
-> IAM login user: manuel@kiessling.net

AWS Infra account is 325062206315 (infra-webapp-prod).
-> IAM user manuel@kiessling.net@mercury-org-iam can change into role AccountManager@infra-webapp-prod.
-> https://signin.aws.amazon.com/switchrole?roleName=AccountManager&account=325062206315

The latest version of terraform is available at `/usr/local/bin/terraform-1.14.4`.

File `secrets/AWS.txt` looks like this:

AWS_ACCESS_KEY_ID=redacted       # AWS_ACCESS_KEY_ID for AWS IAM user manuel@kiessling.net@mercury-org-iam
AWS_SECREAT_ACCESS_KEY=redacted  # AWS_SECREAT_ACCESS_KEY for AWS IAM user manuel@kiessling.net@mercury-org-iam

File `secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json` looks like this:

```json
{
  "type": "service_account",
  "project_id": "ask-a-human-poc",
  "private_key_id": "3a666671a09bbccf8c4c7519579dd778d2bace56",
  "private_key": "redacted",
  "client_email": "firebase-adminsdk-fbsvc@ask-a-human-poc.iam.gserviceaccount.com",
  "client_id": "107432254060669727843",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ask-a-human-poc.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

We have full control over domain `ask-a-human.com`, including DNS records management. This domain is registered through German hoster IONOS (not Amazon Registrar / Route53).
