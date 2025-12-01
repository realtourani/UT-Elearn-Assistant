console.log("UT Elearn: Scraper Active");

async function fetchAssignmentsFromIndex(courseId, courseName) {
    const indexUrl = `https://elearn.ut.ac.ir/mod/assign/index.php?id=${courseId}`;
    try {
        const response = await fetch(indexUrl, { credentials: 'include' });
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Check for login page (Session expired)
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

            // Date Extraction
            const dateCell = row.querySelector('td[data-mdl-overview-item="duedate"]');
            if (dateCell) {
                dateString = dateCell.innerText.trim(); 
            } else {
                const cells = row.querySelectorAll('td');
                if (cells.length > 2) dateString = cells[2].innerText.trim();
            }
            dateString = dateString.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

            // Status Check
            const statusCell = row.querySelector('td[data-mdl-overview-item="submissionstatus"]');
            const rowText = row.innerText;
            if (statusCell) {
                 if (statusCell.innerText.includes("تحویل داده شده") || statusCell.innerText.includes("Submitted")) isSubmitted = true;
            } else {
                 if (rowText.includes("تحویل داده شده") || rowText.includes("Submitted")) isSubmitted = true;
            }

            if (!assignments.find(a => a.link === link)) {
                assignments.push({
                    courseName: courseName,
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
    // 1. Find Course Cards directly on the page
    const courseElements = document.querySelectorAll('.course-card, [data-region="course-content"]');
    
    if (courseElements.length === 0) {
        console.log("No courses found. Please ensure you are on https://elearn.ut.ac.ir/my/courses.php");
        return;
    }

    let fetchPromises = [];

    courseElements.forEach(el => {
        const courseId = el.getAttribute('data-course-id');
        let courseName = "Course " + courseId;
        const nameEl = el.querySelector('.coursename, .multiline');
        if (nameEl) courseName = nameEl.innerText.trim();

        if (courseId) {
            fetchPromises.push(fetchAssignmentsFromIndex(courseId, courseName));
        }
    });

    const results = await Promise.all(fetchPromises);
    
    // Safety check: if any result is null, session is invalid
    if (results.some(r => r === null)) {
        try { chrome.runtime.sendMessage({action: "session_expired"}); } catch(e){}
        return; 
    }

    const allAssignments = results.flat();

    // Save Data
    chrome.storage.local.set({ 
        'ut_assignments': allAssignments,
        'last_updated': new Date().getTime() 
    }, () => {
        try { chrome.runtime.sendMessage({action: "data_updated"}); } catch(e){}
    });
}

scanDashboard();