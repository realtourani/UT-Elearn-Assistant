chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("fetchAssignments", { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "fetchAssignments") fetchAndSaveData();
});

async function fetchAndSaveData() {
    try {
        // 1. Get Dashboard text
        const dashResponse = await fetch('https://elearn.ut.ac.ir/my/courses.php', { credentials: 'include' });
        const dashText = await dashResponse.text();

        if (dashText.includes("login/index.php")) return; // Not logged in

        // 2. Extract Course IDs (Simple Regex)
        // Matches: data-course-id="12345"
        const courseIds = [...dashText.matchAll(/data-course-id=["'](\d+)["']/g)].map(m => m[1]);
        const uniqueIds = [...new Set(courseIds)];

        if (uniqueIds.length === 0) return;

        let allAssignments = [];

        // 3. Fetch each course index
        for (const courseId of uniqueIds) {
            const indexUrl = `https://elearn.ut.ac.ir/mod/assign/index.php?id=${courseId}`;
            try {
                const assignResponse = await fetch(indexUrl, { credentials: 'include' });
                const assignText = await assignResponse.text();

                // 4. Extract Assignment Links (LOOSE REGEX)
                // Looks for: href=".../mod/assign/view.php?id=..." and captures the text inside the <a> tag
                const linkRegex = /href=["']([^"']+\/mod\/assign\/view\.php\?id=\d+)["'][^>]*>([^<]+)<\/a>/g;
                let match;

                while ((match = linkRegex.exec(assignText)) !== null) {
                    const link = match[1];
                    const name = match[2].trim();

                    if (!allAssignments.find(a => a.link === link)) {
                        allAssignments.push({
                            courseName: "Course " + courseId, // Background worker can't easily parse names
                            name: name,
                            link: link,
                            dateString: "Check Link", // Background worker can't parse table columns easily
                            isSubmitted: false
                        });
                    }
                }
            } catch (e) { /* ignore error */ }
        }

        // 5. Save only if we found something
        if (allAssignments.length > 0) {
            chrome.storage.local.set({ 
                'ut_assignments': allAssignments,
                'last_updated': new Date().getTime() 
            });
        }

    } catch (err) {
        console.error(err);
    }
}