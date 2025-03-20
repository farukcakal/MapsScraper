# MapsScraper

MapsScraper is a Node.js-based tool that collects business information from Google Maps based on a user-provided search term and exports the data to an Excel file.

## Features

- Prompts the user for a search term via the terminal.
- Searches Google Maps for the provided term.
- Collects business details, including:
  - Name
  - Address
  - Phone number
  - Website
  - Working hours
  - Latitude and longitude
- Saves the collected data in an Excel (xlsx) file.
- Uses Puppeteer Stealth to avoid bot detection.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/farukcakal/MapsScraper.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd MapsScraper
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure the `.env` file:**
   - `CONCURRENT_TABS`: Maximum number of browser tabs to open simultaneously (default: 5).
   - `USE_PROXY`: Set to `true` to enable proxy usage, or `false` to disable it.
   - `PROXY_LIST`: Provide proxy credentials in the format `user:pass@ip:port,anotheruser:anotherpass@anotherip:anotherport`.

## Usage

1. **Run the script:**
   ```bash
   npm start
   ```

2. **Enter a search term when prompted:**
   ```bash
   Please enter the search term: cafe New York
   ```

3. **Output:**
   - The program searches Google Maps for the term "cafe New York."
   - It collects business details and saves them in an Excel file named `cafe_new_york_<date>.xlsx`.

## Technical Details

- **Puppeteer**: Used to automate browser interactions with Google Maps.
- **Scrolling**: The script scrolls through the results page to load all businesses.
- **Duplicate Check**: Ensures no duplicate entries are added to the dataset.
- **Excel Export**: Data is saved in an Excel file using the `xlsx` library.

## Notes

- **Bot Detection**: Google may block frequent requests from bots. Use this tool responsibly.
- **Proxy/VPN**: To avoid IP bans, consider using a proxy or VPN.
- **Page Load Issues**: If the page does not load, check your internet connection or verify if Google Maps' design has changed.

## Example Output

Here is an example of the data collected by the tool:

| Name          | Address               | Phone       | Website         | Latitude  | Longitude  | Working Hours          |
|---------------|-----------------------|-------------|-----------------|-----------|------------|------------------------|
| Cafe Example  | 123 Main St, New York | +1 555-1234 | www.example.com | 40.7128   | -74.0060   | Mon-Fri: 8 AM - 6 PM  |

## License

This project is licensed under the [MIT License](LICENSE).
