from django.core.management.base import BaseCommand
from accounts.models import User, Zone
from surveys.models import SurveyResponse, MasterAddress

class Command(BaseCommand):
    help = 'Seeds initial data if database is empty'

    def handle(self, *args, **options):
        self.stdout.write('Seeding initial data...')

        # Clear existing zones and surveys (due to PROTECT)
        self.stdout.write('Clearing existing surveys and zones...')
        SurveyResponse.objects.all().delete()
        Zone.objects.all().delete()

        # Create Zones (Mangalore Areas)
        zones_data = [
            {'name': 'Hampankatta', 'code': '575001', 'center_latitude': 12.8700, 'center_longitude': 74.8425, 'radius_meters': 1000},
            {'name': 'Bunder', 'code': '575001', 'center_latitude': 12.8650, 'center_longitude': 74.8390, 'radius_meters': 1000},
            {'name': 'Gandhinagar', 'code': '575003', 'center_latitude': 12.8780, 'center_longitude': 74.8350, 'radius_meters': 1000},
            {'name': 'Lalbagh', 'code': '575003', 'center_latitude': 12.8730, 'center_longitude': 74.8380, 'radius_meters': 1000},
            {'name': 'Kodialbail', 'code': '575003', 'center_latitude': 12.8750, 'center_longitude': 74.8400, 'radius_meters': 1000},
            {'name': 'Bejai', 'code': '575004', 'center_latitude': 12.8850, 'center_longitude': 74.8450, 'radius_meters': 3000},
            {'name': 'Kadri', 'code': '575002', 'center_latitude': 12.8800, 'center_longitude': 74.8500, 'radius_meters': 1000},
            {'name': 'Kankanady', 'code': '575002', 'center_latitude': 12.8680, 'center_longitude': 74.8550, 'radius_meters': 1000},
            {'name': 'Valencia', 'code': '575002', 'center_latitude': 12.8600, 'center_longitude': 74.8550, 'radius_meters': 1000},
            {'name': 'Jeppu', 'code': '575002', 'center_latitude': 12.8550, 'center_longitude': 74.8400, 'radius_meters': 1000},
            {'name': 'Falnir', 'code': '575002', 'center_latitude': 12.8650, 'center_longitude': 74.8450, 'radius_meters': 1000},
            {'name': 'Attavar', 'code': '575001', 'center_latitude': 12.8600, 'center_longitude': 74.8450, 'radius_meters': 1000},
            {'name': 'Pandeshwar', 'code': '575001', 'center_latitude': 12.8600, 'center_longitude': 74.8400, 'radius_meters': 1000},
            {'name': 'Hoige Bazar', 'code': '575001', 'center_latitude': 12.8550, 'center_longitude': 74.8350, 'radius_meters': 1000},
            {'name': 'Mangaladevi', 'code': '575001', 'center_latitude': 12.8500, 'center_longitude': 74.8400, 'radius_meters': 1000},
        ]
        
        for zone_data in zones_data:
            Zone.objects.create(**zone_data)
        
        self.stdout.write(f'Created {len(zones_data)} Mangalore zones.')
        
        # Fetch zones for users
        try:
            hampankatta_zone = Zone.objects.get(name='Hampankatta')
            kadri_zone = Zone.objects.get(name='Kadri')
        except Zone.DoesNotExist:
            self.stdout.write(self.style.ERROR('Could not find created zones. Something went wrong.'))
            return

        # Create Master Addresses (for validation)
        self.stdout.write('Creating sample Master Addresses...')
        MasterAddress.objects.all().delete()
        
        # Addresses for Hampankatta (ZN001) - Pincode 575001
        for i in range(1, 6):
            MasterAddress.objects.create(
                zone=hampankatta_zone,
                pincode='575001',
                address_line1=f'Hampankatta Cross Road {i}',
                building_number=f'HK-{i}',
            )
            
        # Addresses for Kadri (ZN007) - Pincode 575002
        for i in range(1, 6):
            MasterAddress.objects.create(
                zone=kadri_zone,
                pincode='575002',
                address_line1=f'Kadri Temple Road {i}',
                building_number=f'KD-{i}',
            )
            
        # Addresses for Bejai (ZN006) - Pincode 575004
        bejai_zone = Zone.objects.get(name='Bejai')
        for i in range(1, 6):
            MasterAddress.objects.create(
                zone=bejai_zone,
                pincode='575004',
                address_line1=f'Bejai Main Road {i}',
                building_number=f'BJ-{i}',
            )
            
        self.stdout.write('Created sample Master Addresses.')

        # Cleanup stale users (Bangalore/Mysore)
        self.stdout.write('Cleaning up stale users...')
        User.objects.filter(full_name__icontains='Bangalore').delete()
        User.objects.filter(full_name__icontains='Mysore').delete()

        # Create Users
        users_data = [
            {
                'phone_number': '+919876543210',
                'defaults': {
                    'full_name': 'Admin',
                    'role': 'ADMIN',
                    'is_active': True,
                    'is_staff': True,
                    'is_superuser': True
                }
            },
            {
                'phone_number': '+919876543200',
                'defaults': {
                    'full_name': 'Supervisor',
                    'role': 'SUPERVISOR',
                    'zone': hampankatta_zone,
                    'is_active': True
                }
            },
            {
                'phone_number': '+919876500000',
                'defaults': {
                    'full_name': 'Surveyor',
                    'role': 'SURVEYOR',
                    'zone': kadri_zone,
                    'daily_target': 20,
                    'is_active': True
                }
            },
             {
                'phone_number': '+919876500001',
                'defaults': {
                    'full_name': 'Surveyor 2',
                    'role': 'SURVEYOR',
                    'zone': bejai_zone,
                    'daily_target': 15,
                    'is_active': True
                }
            },
        ]

        # Generate Surveyors for all zones
        zones = Zone.objects.all()
        base_phone = 9876500002
        
        for zone in zones:
            # Create a Supervisor for each zone if not exists
            sup_phone = f"+91{base_phone}"
            base_phone += 1
            users_data.append({
                'phone_number': sup_phone,
                'defaults': {
                    'full_name': f'Supervisor - {zone.name}',
                    'role': 'SUPERVISOR',
                    'zone': zone,
                    'is_active': True
                }
            })
            
            # Create 3 Surveyors for each zone
            for i in range(1, 4):
                surv_phone = f"+91{base_phone}"
                base_phone += 1
                users_data.append({
                    'phone_number': surv_phone,
                    'defaults': {
                        'full_name': f'Surveyor {i} - {zone.name}',
                        'role': 'SURVEYOR',
                        'zone': zone,
                        'daily_target': 10,
                        'is_active': True
                    }
                })
        
        for user_data in users_data:
            user, created = User.objects.update_or_create(
                phone_number=user_data['phone_number'],
                defaults=user_data['defaults']
            )
            if created:
                user.set_password('password123')
                user.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded users.'))
