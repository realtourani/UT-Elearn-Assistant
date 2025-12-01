document.addEventListener('DOMContentLoaded', () => {
    loadAssignments();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        const loading = document.getElementById('loading');
        const container = document.getElementById('container');
        const emptyState = document.getElementById('empty-state');
        
        loading.classList.remove('hidden');
        loading.innerText = "درحال بررسی صفحه...";
        loading.style.backgroundColor = "#252525"; loading.style.color = "#ffbb33";
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;
            const dashboardUrl = "https://elearn.ut.ac.ir/my/courses.php";

            if (currentUrl.includes("elearn.ut.ac.ir/my/courses.php")) {
                loading.innerText = "در حال دریافت اطلاعات از داشبورد...";
                emptyState.classList.add('hidden');
                chrome.scripting.executeScript({ target: {tabId: currentTab.id}, files: ['content.js'] });
            } else if (currentUrl.includes("elearn.ut.ac.ir")) {
                loading.classList.add('hidden');
                container.innerHTML = `
                    <div style="text-align:center; padding: 20px; color: #ffbb33;">
                        <p style="margin-bottom:10px;">برای بروزرسانی، باید در صفحه «درس‌های من» باشید.</p>
                        <button id="goToDashBtn" style="background-color: #0d6efd; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-family: inherit;">رفتن به داشبورد</button>
                    </div>`;
                document.getElementById('goToDashBtn').addEventListener('click', () => {
                    chrome.tabs.update(currentTab.id, { url: dashboardUrl });
                    window.close(); 
                });
            } else {
                loading.classList.add('hidden');
                alert("لطفا ابتدا وارد سایت سامانه یادگیری (elearn.ut.ac.ir) شوید.");
            }
        });
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "data_updated") {
            loadAssignments();
            document.getElementById('loading').classList.add('hidden');
        }
        if (request.action === "session_expired") {
            const loading = document.getElementById('loading');
            loading.classList.remove('hidden');
            loading.innerText = "⚠️ نشست منقضی شد. لطفا صفحه را رفرش کنید.";
            loading.style.backgroundColor = "#aa0000"; loading.style.color = "white";
        }
    });
});

function loadAssignments() {
    chrome.storage.local.get(['ut_assignments', 'last_updated'], (result) => {
        const container = document.getElementById('container');
        container.innerHTML = ''; 

        const allTasks = result.ut_assignments || [];

        if (allTasks.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            document.getElementById('stats-bar').innerText = "وضعیت: نیازمند بروزرسانی";
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');
        updateStatsBar(result.last_updated, allTasks);

        // === 1. GROUP TASKS BY COURSE NAME ===
        const groupedTasks = {};
        allTasks.forEach(task => {
            if (!groupedTasks[task.courseName]) {
                groupedTasks[task.courseName] = [];
            }
            groupedTasks[task.courseName].push(task);
        });

        // === 2. RENDER GROUPS ===
        // Iterate over course names
        Object.keys(groupedTasks).sort().forEach(courseName => {
            // Get tasks for this course and sort them (pending first)
            const courseTasks = groupedTasks[courseName].sort((a, b) => a.isSubmitted - b.isSubmitted);

            // Create Course Container
            const groupDiv = document.createElement('div');
            groupDiv.className = 'course-group';

            // Create Course Header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'course-group-header';
            headerDiv.innerText = courseName;
            groupDiv.appendChild(headerDiv);

            // Create Task Rows inside the container
            courseTasks.forEach(task => {
                const taskRow = document.createElement('div');
                const rowClass = task.isSubmitted ? 'task-row done' : 'task-row soon';
                taskRow.className = rowClass;
                
                const statusIcon = task.isSubmitted ? '✅' : '📅';

                taskRow.innerHTML = `
                    <div class="task-header">
                        <div class="task-title">${statusIcon} ${task.name}</div>
                        ${task.isSubmitted ? '<span class="mini-tag">انجام شد</span>' : ''}
                    </div>
                    <div class="task-meta">
                        <div class="deadline">⌛ ${task.dateString}</div>
                        <a href="${task.link}" target="_blank" class="action-btn">مشاهده</a>
                    </div>
                `;
                groupDiv.appendChild(taskRow);
            });

            container.appendChild(groupDiv);
        });
    });
}

function updateStatsBar(lastUpdated, tasks) {
    const pendingCount = tasks.filter(t => !t.isSubmitted).length;
    if (lastUpdated) {
        const date = new Date(lastUpdated);
        const minutes = date.getMinutes().toString().padStart(2, '0');
        document.getElementById('stats-bar').innerText = 
            `بروزرسانی: ${date.getHours()}:${minutes} | ${pendingCount} تکلیف باقی‌مانده`;
    }
}