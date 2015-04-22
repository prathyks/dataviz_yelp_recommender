from collections import defaultdict

__author__ = 'VamshiKrishna'


import json
from pprint import pprint

with open('phxrest.json') as data_file:
    data = json.load(data_file)

categories = defaultdict(int)
stars = defaultdict(int)
attributes = defaultdict(int)
ambience = defaultdict(int)
dummy=0

print(len(data))

for i in range(len(data)):
    temp = dict(data[i]['attributes'])
    try:
        temp_1 = dict(data[i]['attributes']['Ambience'])
        for ambi, val in temp_1.items():
            if val == True:
                ambience[ambi] += 1

    except:
        dummy = dummy+1

    for attr, val in temp.items():
        try:
            attributes[attr] += 1
        except:
            dummy = dummy +1


    stars[str(data[i]['stars'])] += 1
    for j in range(len(data[i]['categories'])):
        categories[str(data[i]['categories'][j])] += 1

#print(ambience)
#print(attributes)
#print(categories)
#print(stars)

ambience_index = defaultdict(int)
categories_index = defaultdict(int)
attributes_index = defaultdict(int)
stars_index = defaultdict(int)

f = open('categories.csv', 'w')
i=0
f.write("id,category,count\n")
for attr, val in categories.items():

    categories_index[attr] = i
    f.write("%s,%s,%s\n" % (i, attr, val) )
    i=i+1

f.close()

f = open('ratings.csv', 'w')
i=0
f.write("id,rating,count\n")
for attr, val in stars.items():

    stars_index[attr] = i
    f.write("%s,%s,%s\n" % (i, attr, val) )
    i=i+1

f.close()
#print(stars_index)
f = open('ambience.csv', 'w')
i=0
f.write("id,Ambience,count\n")
for attr, val in ambience.items():

    ambience_index[attr] = i
    f.write("%s,%s,%s\n" % (i, attr, val) )
    i=i+1

f.close()

f = open('atributes.csv', 'w')
i=0
f.write("id,Attributes,count\n")
for attr, val in attributes.items():

    attributes_index[attr] = i
    f.write("%s,%s,%s\n" % (i, attr, val) )
    i=i+1

f.close()

f = open('main_table.csv', 'w')
f.write("id,Ratings,Attributes,Categories,Ambience \n")
for x in range(len(data)):
    attr_data = dict(data[x]['attributes'])
    star_data = data[x]['stars']
    cat_data = data[x]['categories']

    f.write("%s,%s," %(x,stars_index[str(star_data)]))

    for attr, val in attr_data.items():
        f.write("%s " %attributes_index[attr])
    f.write(",")

    for cat in cat_data:
        f.write("%s " %categories_index[cat])

    f.write(",")

    try:
        amb_data = dict(data[x]['attributes']['Ambience'])
        for amb, val in amb_data.items():
            f.write("%s " %ambience_index[amb])

        f.write("\n")
    except:
        f.write("NULL\n")

f.close()



