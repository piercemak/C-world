from django.core.management.base import BaseCommand
from googlemapsAPP.models import Location
import requests
from bs4 import BeautifulSoup


class Command(BaseCommand):
    help = 'Scrapes observatory data and stores it in the database'

    def handle(self, *args, **options):
        self.stdout.write("Starting the scraping process")
        base_url = 'https://www.go-astronomy.com'
        location_links = self.scrape_location_links(base_url)

        for location_link in location_links:
            observatory_links = self.scrape_observatory_links(base_url, location_link)
            
            for observatory_link in observatory_links:
                details = self.scrape_observatory_details(observatory_link)
                if details:
                    self.save_to_database(details)
                    self.stdout.write(self.style.SUCCESS(f"Successfully added {details['name']}"))

        self.stdout.write(self.style.SUCCESS("Scraping process completed"))



    def fetch_html(self, url):
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        return BeautifulSoup(response.content, 'html.parser')
    

    def scrape_location_links(self, base_url):
        soup = self.fetch_html(base_url + '/observatories.htm')
        return [base_url + '/' + a['href'] for a in soup.find_all('a', href=True)
                if 'observatories-state.php?State=' in a['href'] or 'observatories-' in a['href'] and '.php' in a['href']]
    

    def scrape_observatory_links(self, base_url, location_url):
        soup = self.fetch_html(location_url)
        return [base_url + '/' + a['href'] for a in soup.find_all('a', href=True)
                if 'observatory.php?ID=' in a['href'] or 'observatory-global.php?ID=' in a['href']] 


    def scrape_observatory_details(self, observatory_url):
        soup = self.fetch_html(observatory_url)
        name = soup.find('h1').text.strip() if soup.find('h1') else 'Name not found'
        
        space_telescopes = [
            'ARIEL', 'ATHENA', 'Chandra X-ray Observatory', 'CHEOPS', 'Euclid Telescope',
            'Hinode', 'HXMT Telescope', 'ILO-1', 'INTEGRAL', 'IXPE', 'James Webb Telescope',
            'LISA', 'LUVOIR', 'Neil Gehrels Swift', 'NuSTAR', 'PLATO', 'SOFIA Telescope',
            'Solar Heliospheric Observatory', 'Spektr-RG', 'SPHEREx', 'Transiting Exoplanet Survey Satellite',
            'XMM-Newton', 'XPoSat'
        ]

        if any(space_name in name for space_name in space_telescopes):
            print(f"Skipping space-based observatory: {name}")
            return None          
        
        details = {
            'name': name,
            'address': soup.find(text='Address:').find_next().text if soup.find(text='Address:') else 'Address not found',
            'zipcode': soup.find(text='Zip:').find_next().text if soup.find(text='Zip:') else 'Zipcode not found',
            'city': soup.find(text='Location:').find_next().text if soup.find(text='Location:') else 'Location not found',
            'country': soup.find(text='Country:').find_next().text if soup.find(text='Country:') else 'Country not found'
        }
        return details




    def save_to_database(self, details):
        Location.objects.create(
            name=details['name'],
            address=details['address'],
            zipcode=details['zipcode'],
            city=details['city'],
            country=details['country']
        )



