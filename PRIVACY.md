# Privacy Policy (UT Elearn Assistant)

**Last Updated:** December 2, 2025

**UT Elearn Assistant** is a privacy-first Chrome extension designed to help University of Tehran students track their assignments and deadlines.

**We DO NOT collect, sell, or transmit any user data.**

### Our Commitment to Your Privacy

**1. No Personal Information Collection**
UT Elearn Assistant does not collect, store, or transmit any personally identifiable information (such as your name, student ID, password, email, or address).

**2. Local Data Storage Only**
All data fetched by the extension (course names, assignment titles, deadlines, and submission status) is stored **locally** on your device using the browser's `chrome.storage.local` API. This data is used solely to display your to-do list within the extension popup and is **never** sent to any external server or cloud database.

**3. No Authentication Credential Storage**
The extension operates by utilizing your existing, active login session with the University of Tehran website (`elearn.ut.ac.ir`). We **do not** ask for, read, or store your username or password. If you are logged out of the university website, the extension simply pauses until you log back in.

**4. No External Data Transmission**
The extension communicates exclusively with `https://elearn.ut.ac.ir` to fetch assignment details. No data is ever transmitted to the developer or any third-party services.

**5. Minimal Permissions**
We request only the minimum permissions necessary for the extension to function:
* **Storage:** To save your assignment list locally so it loads instantly.
* **Alarms:** To periodically check for new homework in the background.
* **Scripting & ActiveTab:** To parse the assignment details from the university dashboard.
* **Host Permission:** Strictly limited to `https://elearn.ut.ac.ir/` to fetch your specific course data.

**6. No Analytics or Tracking**
UT Elearn Assistant does not include any analytics software (like Google Analytics), tracking scripts, or advertisements.

Your privacy is our priority. The code is open for inspection to verify these claims. If you have any questions or concerns regarding this policy, please feel free to open an issue on the GitHub repository.