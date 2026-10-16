import urllib.request,urllib.error,json
endpoint='https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds'
cases=[(urllib.request.Request(endpoint,data=json.dumps({'action':'download','id':'not-a-build'}).encode(),headers={'Content-Type':'application/json'}),401),(urllib.request.Request(endpoint+'?ticket=invalid&signature=fake'),403)]
for request,expected in cases:
 try:urllib.request.urlopen(request);raise AssertionError('Unauthorized request accepted')
 except urllib.error.HTTPError as error:assert error.code==expected,(error.code,error.read());print('Private beta access refused as expected: HTTP '+str(expected))
