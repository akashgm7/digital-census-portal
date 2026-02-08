"""
Management command to seed sample data for testing.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from accounts.models import User, Zone
from surveys.models import MasterAddress, SurveyResponse, DailyProgress


class Command(BaseCommand):
    help = 'Seed database with sample data for testing'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Create zones
        zones = []
        zone_data = [
            ('Bangalore North', 'BLR-N', 12.9716, 77.5946),
            ('Bangalore South', 'BLR-S', 12.9021, 77.5732),
            ('Bangalore East', 'BLR-E', 12.9719, 77.6412),
            ('Bangalore West', 'BLR-W', 12.9611, 77.5245),
            ('Mysore Central', 'MYS-C', 12.2958, 76.6394),
        ]
        
        for name, code, lat, lng in zone_data:
            zone, created = Zone.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'center_latitude': lat,
                    'center_longitude': lng,
                    'radius_meters': 500
                }
            )
            zones.append(zone)
            if created:
                self.stdout.write(f'  Created zone: {name}')
        
        # Create admin user
        admin, created = User.objects.get_or_create(
            phone_number='+919876543210',
            defaults={
                'full_name': 'System Administrator',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            self.stdout.write('  Created admin user: +919876543210')
        
        # Create supervisors (one per zone)
        supervisors = []
        for i, zone in enumerate(zones):
            phone = f'+91987654320{i}'
            supervisor, created = User.objects.get_or_create(
                phone_number=phone,
                defaults={
                    'full_name': f'Supervisor {zone.name}',
                    'role': 'SUPERVISOR',
                    'zone': zone,
                    'daily_target': 50
                }
            )
            supervisors.append(supervisor)
            if created:
                self.stdout.write(f'  Created supervisor: {phone}')
        
        # Create surveyors (3 per zone)
        surveyors = []
        for i, zone in enumerate(zones):
            for j in range(3):
                phone = f'+9198765{i:02d}{j:02d}0'
                surveyor, created = User.objects.get_or_create(
                    phone_number=phone,
                    defaults={
                        'full_name': f'Surveyor {j+1} - {zone.name}',
                        'role': 'SURVEYOR',
                        'zone': zone,
                        'daily_target': 10
                    }
                )
                surveyors.append(surveyor)
                if created:
                    self.stdout.write(f'  Created surveyor: {phone}')
        
        # Create master addresses
        pincodes = ['560001', '560002', '560003', '560004', '570001']
        for i, zone in enumerate(zones):
            pincode = pincodes[i]
            for j in range(10):
                address, created = MasterAddress.objects.get_or_create(
                    zone=zone,
                    pincode=pincode,
                    address_line1=f'{j+1} Main Street, Block {chr(65+j)}',
                    defaults={
                        'landmark': f'Near {zone.name} Park',
                        'building_number': str(j+1),
                        'latitude': float(zone.center_latitude) + random.uniform(-0.001, 0.001),
                        'longitude': float(zone.center_longitude) + random.uniform(-0.001, 0.001)
                    }
                )
        
        self.stdout.write('  Created master addresses')
        
        # Create sample surveys
        statuses = ['SUBMITTED', 'VERIFIED', 'SUBMITTED', 'VERIFIED', 'VERIFIED']
        occupations = ['Farmer', 'Teacher', 'Driver', 'Shop Owner', 'Laborer', 'Student']
        
        for surveyor in surveyors:
            # Create 5 surveys per surveyor
            for i in range(5):
                survey = SurveyResponse.objects.create(
                    surveyor=surveyor,
                    zone=surveyor.zone,
                    pincode=pincodes[zones.index(surveyor.zone)],
                    address_line=f'House {i+1}, {surveyor.zone.name}',
                    status=random.choice(statuses),
                    gps_latitude=float(surveyor.zone.center_latitude) + random.uniform(-0.0001, 0.0001),
                    gps_longitude=float(surveyor.zone.center_longitude) + random.uniform(-0.0001, 0.0001),
                    location_warning=random.choice([True, False, False, False]),
                    head_name=f'Head of Family {i+1}',
                    head_gender=random.choice(['MALE', 'FEMALE']),
                    head_age=random.randint(25, 65),
                    head_phone=f'+91{random.randint(7000000000, 9999999999)}',
                    head_occupation=random.choice(occupations),
                    total_members=random.randint(2, 8),
                    male_members=random.randint(1, 4),
                    female_members=random.randint(1, 4),
                    submitted_at=timezone.now() - timedelta(days=random.randint(0, 6))
                )
                
                # Fix gender sum
                survey.other_members = survey.total_members - survey.male_members - survey.female_members
                if survey.other_members < 0:
                    survey.total_members = survey.male_members + survey.female_members
                    survey.other_members = 0
                survey.save()
                
                # Set verified_by for verified surveys
                if survey.status == 'VERIFIED':
                    survey.verified_by = supervisors[zones.index(surveyor.zone)]
                    survey.verified_at = timezone.now()
                    survey.save()
        
        self.stdout.write('  Created sample surveys')
        
        # Create daily progress
        today = date.today()
        for surveyor in surveyors:
            DailyProgress.objects.get_or_create(
                surveyor=surveyor,
                date=today,
                defaults={
                    'target': surveyor.daily_target,
                    'surveys_completed': random.randint(0, surveyor.daily_target)
                }
            )
        
        self.stdout.write('  Created daily progress')
        
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write('')
        self.stdout.write('Test Credentials:')
        self.stdout.write('  Admin: +919876543210')
        self.stdout.write('  Supervisor: +919876543200')
        self.stdout.write('  Surveyor: +919876500000')
