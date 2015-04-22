__author__ = 'VamshiKrishna'

from bs4 import BeautifulSoup

with open('states.xml','r') as f:
    content = f.read()
soup_obj = BeautifulSoup(content)

fo = open('coords.txt','w')
for coord in soup_obj.find_all('point'):
    fo.write("%s,%s|" %(coord['lat'],coord['lng']))

fo.close()
