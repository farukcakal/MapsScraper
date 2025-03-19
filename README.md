# MapsScraper
This project collects business information from Google Maps based on a given search term and saves it to an Excel file.

### Features
- Prompts the user for a search term via the terminal.
- Searches on Google Maps
- Collects business details (name, address, hours, phone, website)
- Saves data in Excel (xlsx) format.
- Uses Puppeteer Stealth to avoid detection.

### Installation
1.  Clone the repository:
```bash
git clone https://github.com/farukcakal/MapsScraper.git
```
2.  Navigate to project directory:

```bash
cd MapsScraper
```
3.  Install dependencies:

```bash
npm install
```

### Usage
Run the following command in the terminal to start the script:
```bash
npm start
```
The terminal will prompt you to enter a search term:
```bash
Please enter the search term:
```
Example:
```bash
Please enter the search term: cafe New York
```

Output:
- The program searches for "cafe New York" on Google Maps.
- It collects business information.
- Saves the results in a file named cafe_new_york.xlsx

### Technical Details
- Uses Puppeteer to navigate Google Maps.
- Scrolls through the page to load all results.
- Extracts business details while checking for duplicates.
- Generates an Excel file once the process is complete.

### Notes
- Google may detect and block bots making frequent requests, so use this tool carefully.
- If the page does not load, check your internet connection and whether Google Maps design has changed.
- To avoid IP bans, consider using a VPN or proxy.

### License
This project is licensed under the MIT License.
