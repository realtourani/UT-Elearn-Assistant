// content.js - v9.1 (Clean Names)
console.log("UT Elearn: Scraper Active");

// --- Helper: Clean up messy course names ---
function cleanCourseName(rawName) {
    if (!rawName) return "درس نامشخص";

    // 1. Remove the static label "نام درس" if present
    let clean = rawName.replace("نام درس", "").replace("Course Name", "");

    // 2. Split by newlines (fixes duplicates like "Algo\nAlgo")
    // We take the first non-empty line, which is usually the main title.
    const lines = clean.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
        return lines[0];
    }
    
    return clean.trim();
}

async function fetchAssignmentsFromIndex(courseId, courseName) {
    const indexUrl = `https://elearn.ut.ac.ir/mod/assign/index.php?id=${courseId}`;
    try {
        const response = await fetch(indexUrl, { credentials: 'include' });
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        if (doc.title.includes("Login") || doc.title.includes("ورود")) {
            return null; 
        }

        const rows = doc.querySelectorAll('tr');
        let assignments = [];

        rows.forEach(row => {
            const anchor = row.querySelector('a[href*="/mod/assign/view.php?id="]');
            if (!anchor) return;

            const name = anchor.innerText.trim();
            const link = anchor.href;
            let dateString = "نامشخص";
            let isSubmitted = false;

            const dateCell = row.querySelector('td[data-mdl-overview-item="duedate"]');
            if (dateCell) {
                dateString = dateCell.innerText.trim(); 
            } else {
                const cells = row.querySelectorAll('td');
                if (cells.length > 2) dateString = cells[2].innerText.trim();
            }
            dateString = dateString.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

            const statusCell = row.querySelector('td[data-mdl-overview-item="submissionstatus"]');
            const rowText = row.innerText;
            if (statusCell) {
                 if (statusCell.innerText.includes("تحویل داده شده") || statusCell.innerText.includes("Submitted")) isSubmitted = true;
            } else {
                 if (rowText.includes("تحویل داده شده") || rowText.includes("Submitted")) isSubmitted = true;
            }

            if (!assignments.find(a => a.link === link)) {
                assignments.push({
                    courseName: courseName, // Now using the cleaned name
                    name: name,
                    link: link,
                    dateString: dateString,
                    isSubmitted: isSubmitted
                });
            }
        });
        return assignments;
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function scanDashboard() {
    const courseElements = document.querySelectorAll('.course-card, [data-region="course-content"]');
    
    if (courseElements.length === 0) {
        console.log("No courses found. Ensure you are on the dashboard.");
        return;
    }

    let fetchPromises = [];

    courseElements.forEach(el => {
        const courseId = el.getAttribute('data-course-id');
        let courseName = "Course " + courseId;
        
        const nameEl = el.querySelector('.coursename, .multiline');
        if (nameEl) {
            // Apply the cleaning function here
            courseName = cleanCourseName(nameEl.innerText);
        }

        if (courseId) {
            fetchPromises.push(fetchAssignmentsFromIndex(courseId, courseName));
        }
    });

    const results = await Promise.all(fetchPromises);
    
    if (results.some(r => r === null)) {
        try { chrome.runtime.sendMessage({action: "session_expired"}); } catch(e){}
        return; 
    }

    const allAssignments = results.flat();

    chrome.storage.local.set({ 
        'ut_assignments': allAssignments,
        'last_updated': new Date().getTime() 
    }, () => {
        try { chrome.runtime.sendMessage({action: "data_updated"}); } catch(e){}
    });
}

scanDashboard();