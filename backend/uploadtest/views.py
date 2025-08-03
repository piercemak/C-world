import boto3
from django.conf import settings
from rest_framework.decorators import api_view # type: ignore
from rest_framework.response import Response # type: ignore
from django.core.mail import send_mail
from django.conf import settings
from datetime import datetime, timedelta
import base64
import json
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from urllib.parse import quote_plus
import os



CLOUDFRONT_DOMAIN = settings.CLOUDFRONT_DOMAIN

def rsa_signer(message: str):
    key_data = os.getenv("CLOUDFRONT_PRIVATE_KEY")
    if not key_data:
        raise ValueError("Missing CLOUDFRONT_PRIVATE_KEY environment variable")

    private_key = serialization.load_pem_private_key(
        key_data.encode("utf-8"),
        password=None,
        backend=default_backend()
    )

    return private_key.sign(
        message.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA1()
    )

@api_view(['GET'])
def get_signed_url(request):
    key = request.query_params.get('key')
    if not key:
        return Response({'error': 'Missing key parameter'}, status=400)

    resource_url = f"https://{CLOUDFRONT_DOMAIN}/{key}"
    expires = int((datetime.utcnow() + timedelta(hours=1)).timestamp())

    policy = {
        "Statement": [{
            "Resource": resource_url,
            "Condition": {"DateLessThan": {"AWS:EpochTime": expires}}
        }]
    }
    policy_json = json.dumps(policy).replace(" ", "")
    policy_b64 = base64.b64encode(policy_json.encode()).decode()

    signature = rsa_signer(policy_json)
    signature_b64 = base64.b64encode(signature).decode()

    key_pair_id = settings.CLOUDFRONT_KEY_PAIR_ID

    signed_url = (
        f"{resource_url}?Policy={quote_plus(policy_b64)}"
        f"&Signature={quote_plus(signature_b64)}"
        f"&Key-Pair-Id={quote_plus(key_pair_id)}"
    )

    return Response({'url': signed_url})


@api_view(['POST'])
def send_request_email(request):
    media_request = request.data.get('mediaRequest')
    language_subs = request.data.get('languageSubs')

    message = f"Media Request: {media_request}\nLanguage/Subtitles: {language_subs}"
    
    send_mail(
        subject="New Media Request",
        message=message,
        from_email="cworldrequests@gmail.com", 
        recipient_list=["cworldrequests@gmail.com"],
        fail_silently=False,
    )

    return Response({"success": True})