"""
Seed master addresses for ALL 15 zones in development mode.
Each address has a unique Door No.
"""
import os, sys, django
sys.path.append(r'c:\Users\ashish k amin\Desktop\digital-census-portal\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'census_portal.settings')
django.setup()

from accounts.models import Zone
from surveys.models import MasterAddress

# Clear existing addresses
MasterAddress.objects.all().delete()
print("Cleared existing addresses.\n")

# Streets and landmarks for each zone
zone_streets = {
    'Hampankatta': [
        ('Hampankatta Main Road', 'Near Hampankatta Circle'),
        ('KS Rao Road', 'Near Corporation Bank'),
        ('Balmatta Road', 'Near Clock Tower'),
        ('Lighthouse Hill Road', 'Near Lighthouse Hill'),
        ('Masjid Road, Hampankatta', 'Near Juma Masjid'),
        ('PVS Circle Road', 'Near PVS Circle'),
        ('Bunts Hostel Road', 'Near Bunts Hostel'),
        ('Forum Mall Road', 'Near Forum Fiza Mall'),
        ('AB Shetty Circle Road', 'Near AB Shetty Circle'),
        ('MG Road, Hampankatta', 'Near City Centre'),
    ],
    'Bunder': [
        ('Old Port Road, Bunder', 'Near Old Port'),
        ('Fish Market Road, Bunder', 'Near Fish Market'),
        ('Bunder Main Road', 'Near Bunder Junction'),
        ('Sultan Bathery Road', 'Near Sultan Bathery'),
        ('Boat Jetty Road, Bunder', 'Near Boat Jetty'),
        ('Dock Yard Road, Bunder', 'Near Dock Yard'),
        ('Custom House Road', 'Near Custom House'),
        ('Ferry Road, Bunder', 'Near Ferry Terminal'),
        ('Warehouse Lane, Bunder', 'Near Central Warehouse'),
        ('Harbour View Road', 'Near Harbour View Park'),
    ],
    'Gandhinagar': [
        ('Gandhinagar Main Road', 'Near Gandhinagar Bus Stop'),
        ('1st Cross, Gandhinagar', 'Near Corporation School'),
        ('2nd Cross, Gandhinagar', 'Near Ration Shop'),
        ('3rd Cross, Gandhinagar', 'Near Gandhinagar Park'),
        ('4th Cross, Gandhinagar', 'Near Community Hall'),
        ('Temple Road, Gandhinagar', 'Near Ganapathi Temple'),
        ('Market Lane, Gandhinagar', 'Near Vegetable Market'),
        ('School Road, Gandhinagar', 'Near Govt. High School'),
        ('Tank Bund Road, Gandhinagar', 'Near Water Tank'),
        ('Library Road, Gandhinagar', 'Near Public Library'),
    ],
    'Lalbagh': [
        ('Lalbagh Main Road', 'Near Lalbagh Gate'),
        ('1st Cross, Lalbagh', 'Near Lalbagh Garden'),
        ('2nd Cross, Lalbagh', 'Near Lalbagh Masjid'),
        ('Rose Garden Lane, Lalbagh', 'Near Rose Garden'),
        ('Flower Market Road, Lalbagh', 'Near Flower Market'),
        ('Lalbagh Tank Road', 'Near Lalbagh Tank'),
        ('East Gate Road, Lalbagh', 'Near East Gate'),
        ('Nursery Lane, Lalbagh', 'Near Govt. Nursery'),
        ('Fountain Road, Lalbagh', 'Near Glass House'),
        ('Bandstand Road, Lalbagh', 'Near Bandstand'),
    ],
    'Kodialbail': [
        ('Kodialbail Main Road', 'Near Kodialbail Junction'),
        ('1st Cross, Kodialbail', 'Near Kodialbail Police Station'),
        ('2nd Cross, Kodialbail', 'Near Fire Station'),
        ('Jail Road, Kodialbail', 'Near District Jail'),
        ('Court Road, Kodialbail', 'Near District Court'),
        ('Hospital Road, Kodialbail', 'Near Wenlock Hospital'),
        ('Museum Road, Kodialbail', 'Near Shreemanthi Bai Museum'),
        ('Car Street, Kodialbail', 'Near Car Street Temple'),
        ('Bank Road, Kodialbail', 'Near Syndicate Bank'),
        ('Circle Road, Kodialbail', 'Near Kodialbail Circle'),
    ],
    'Bejai': [
        ('Bejai Main Road', 'Near Bejai Junction'),
        ('Bejai New Road', 'Near Bejai Church'),
        ('Kapikad Road, Bejai', 'Near Kapikad'),
        ('Bejai Kapikad Road', 'Near Jyothi Circle'),
        ('Palm Grove Road, Bejai', 'Near Palm Grove'),
        ('Marigold Lane, Bejai', 'Near Marigold Apartments'),
        ('Hill Top Road, Bejai', 'Near Hill Top Colony'),
        ('Temple Lane, Bejai', 'Near Bejai Temple'),
        ('Ashok Nagar, Bejai', 'Near Ashok Nagar Park'),
        ('School Road, Bejai', 'Near Bejai School'),
    ],
    'Kadri': [
        ('Kadri Main Road', 'Near Kadri Temple'),
        ('Kadri Hills Road', 'Near Kadri Park'),
        ('Kadri Kambla Road', 'Near Kambla Grounds'),
        ('Padavu Road, Kadri', 'Near Padavu Junction'),
        ('Shivabagh Road, Kadri', 'Near Shivabagh'),
        ('Nanthoor Road, Kadri', 'Near Nanthoor Circle'),
        ('Temple View Road, Kadri', 'Near Manjunath Temple'),
        ('Lake Side Road, Kadri', 'Near Kadri Lake'),
        ('Garden Lane, Kadri', 'Near Pilikula Garden'),
        ('Mallikatte Road, Kadri', 'Near Mallikatte'),
    ],
    'Kankanady': [
        ('Kankanady Main Road', 'Near Kankanady Junction'),
        ('Pumpwell Circle Road', 'Near Pumpwell Circle'),
        ('Bikarnakatte Road', 'Near Bikarnakatte'),
        ('KPT Road, Kankanady', 'Near KPT Junction'),
        ('Maroli Road, Kankanady', 'Near Maroli'),
        ('Ajjarakad Road, Kankanady', 'Near Ajjarakad'),
        ('Father Muller Road', 'Near Father Muller Hospital'),
        ('Bendoor Well Road', 'Near Bendoor Well'),
        ('Market Road, Kankanady', 'Near Kankanady Market'),
        ('School Lane, Kankanady', 'Near St. Agnes School'),
    ],
    'Valencia': [
        ('Valencia Main Road', 'Near Valencia Church'),
        ('1st Cross, Valencia', 'Near Valencia Ground'),
        ('2nd Cross, Valencia', 'Near Valencia Junction'),
        ('Hill View Road, Valencia', 'Near Valencia Hill'),
        ('Church Lane, Valencia', 'Near St. Mary Church'),
        ('Garden Street, Valencia', 'Near Public Garden'),
        ('Station Road, Valencia', 'Near Valencia Station'),
        ('College Road, Valencia', 'Near St. Aloysius College'),
        ('Beach Road, Valencia', 'Near Panambur Beach'),
        ('Industrial Area, Valencia', 'Near KIOSK Factory'),
    ],
    'Jeppu': [
        ('Jeppu Main Road', 'Near Jeppu Junction'),
        ('Jeppu Bappal Road', 'Near Jeppu Bappal'),
        ('Jeppu Market Road', 'Near Jeppu Market'),
        ('Morgan Gate Road, Jeppu', 'Near Morgan Gate'),
        ('Rosario Road, Jeppu', 'Near Rosario Church'),
        ('Seminary Road, Jeppu', 'Near Seminary'),
        ('Jeppu Cross Road', 'Near Jeppu Cross'),
        ('Milagres Road, Jeppu', 'Near Milagres Church'),
        ('Port Road, Jeppu', 'Near Jeppu Port'),
        ('Beach Lane, Jeppu', 'Near Jeppu Beach'),
    ],
    'Falnir': [
        ('Falnir Main Road', 'Near Falnir Junction'),
        ('Falnir Cross Road', 'Near Falnir Church'),
        ('Falnir Padil Road', 'Near Padil Junction'),
        ('Falnir Well Road', 'Near Falnir Well'),
        ('Matadakani Road, Falnir', 'Near Matadakani'),
        ('Light House Road, Falnir', 'Near Light House'),
        ('Tagore Park Road, Falnir', 'Near Tagore Park'),
        ('Palm Beach Road, Falnir', 'Near Palm Beach'),
        ('Nethravathi Road, Falnir', 'Near River View'),
        ('Heritage Lane, Falnir', 'Near Heritage Building'),
    ],
    'Attavar': [
        ('Attavar Main Road', 'Near Attavar Junction'),
        ('1st Cross, Attavar', 'Near City Hospital'),
        ('2nd Cross, Attavar', 'Near Attavar Bus Stop'),
        ('Temple Street, Attavar', 'Near Sri Krishna Temple'),
        ('Market Road, Attavar', 'Near Attavar Market'),
        ('School Lane, Attavar', 'Near Govt. School'),
        ('Park Avenue, Attavar', 'Near Children Park'),
        ('Gandhi Nagar, Attavar', 'Near Post Office'),
        ('Nehru Street, Attavar', 'Near Nehru Circle'),
        ('Lake View Road, Attavar', 'Near Kadri Lake'),
    ],
    'Pandeshwar': [
        ('Pandeshwar Main Road', 'Near Pandeshwar Temple'),
        ('Pandeshwar Cross Road', 'Near Pandeshwar Junction'),
        ('Town Hall Road, Pandeshwar', 'Near Town Hall'),
        ('Treasury Road, Pandeshwar', 'Near Treasury Office'),
        ('DC Office Road, Pandeshwar', 'Near DC Office'),
        ('Maidan Road, Pandeshwar', 'Near Nehru Maidan'),
        ('Karavali Road, Pandeshwar', 'Near Karavali Utsav'),
        ('Tagore Road, Pandeshwar', 'Near Tagore Park'),
        ('Central Market Road', 'Near Central Market'),
        ('Bank Lane, Pandeshwar', 'Near SBI Main Branch'),
    ],
    'Hoige Bazar': [
        ('Hoige Bazar Main Road', 'Near Hoige Bazar Market'),
        ('1st Cross, Hoige Bazar', 'Near Fish Market'),
        ('2nd Cross, Hoige Bazar', 'Near Boat Building Yard'),
        ('Old Harbour Road, Hoige Bazar', 'Near Old Harbour'),
        ('Masjid Road, Hoige Bazar', 'Near Hoige Bazar Masjid'),
        ('School Road, Hoige Bazar', 'Near Urdu School'),
        ('Well Lane, Hoige Bazar', 'Near Community Well'),
        ('Shore Road, Hoige Bazar', 'Near Shore Temple'),
        ('Market Lane, Hoige Bazar', 'Near Spice Market'),
        ('Trader Street, Hoige Bazar', 'Near Traders Association'),
    ],
    'Mangaladevi': [
        ('Mangaladevi Main Road', 'Near Mangaladevi Temple'),
        ('Mangaladevi Temple Road', 'Near Temple Gate'),
        ('Boloor Road, Mangaladevi', 'Near Boloor Junction'),
        ('Tank Lane, Mangaladevi', 'Near Temple Tank'),
        ('Flower Garden Road, Mangaladevi', 'Near Flower Garden'),
        ('Heritage Road, Mangaladevi', 'Near Heritage Museum'),
        ('Pilgrim Lane, Mangaladevi', 'Near Pilgrim Rest'),
        ('Festival Road, Mangaladevi', 'Near Festival Ground'),
        ('Old Temple Road, Mangaladevi', 'Near Old Temple'),
        ('Prasad Lane, Mangaladevi', 'Near Prasad Hall'),
    ],
}

door_counter = 1
created_count = 0

for zone in Zone.objects.all().order_by('name'):
    streets = zone_streets.get(zone.name, [
        (f'Street {i}, {zone.name}', f'Near Landmark {i}')
        for i in range(1, 11)
    ])
    
    print(f"Zone: {zone.name} (Pincode: {zone.code})")
    
    for street, landmark in streets:
        addr = MasterAddress.objects.create(
            zone=zone,
            pincode=zone.code,
            address_line1=f'Door No. {door_counter}, {street}',
            landmark=landmark,
            building_number=str(door_counter),
            status='ACTIVE'
        )
        print(f'  Door No. {door_counter} - {street}')
        door_counter += 1
        created_count += 1

print(f"\n✓ Seeded {created_count} addresses across {Zone.objects.count()} zones.")
print(f"  Door numbers: 1 to {door_counter - 1}")
