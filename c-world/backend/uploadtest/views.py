import boto3
from django.conf import settings
from rest_framework.decorators import api_view # type: ignore
from rest_framework.response import Response # type: ignore
from django.core.mail import send_mail


@api_view(['GET'])
def get_signed_url(request):
    s3 = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION_NAME,
    )
    key = request.query_params.get('key') 
    if not key:
        return Response({'error': 'Missing key parameter'}, status=400)
    try:
        show_slug = key.split("_")[1] 
        bucket = f"{show_slug}-media"
    except IndexError:
        return Response({'error': 'Invalid key format'}, status=400)
    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket,
                'Key': key,
            },
            ExpiresIn=3600,
        )
        return Response({'url': url})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def send_request_email(request):
    media_request = request.data.get('mediaRequest')
    language_subs = request.data.get('languageSubs')

    message = f"Media Request: {media_request}\nLanguage/Subtitles: {language_subs}"
    
    send_mail(
        subject="New Media Request",
        message=message,
        from_email="cearaworldrequests@outlook.com", 
        recipient_list=["cearaworldrequests@outlook.com"],
        fail_silently=False,
    )

    return Response({"success": True})