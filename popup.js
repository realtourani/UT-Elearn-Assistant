document.addEventListener('DOMContentLoaded', () => {
    loadAssignments();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        const loading = document.getElementById('loading');
        const container = document.getElementById('container');
        const emptyState = document.getElementById('empty-state');
        
        loading.classList.remove('hidden');
        loading.innerText = "درحال بررسی صفحه...";
        loading.style.backgroundColor = "#252525"; 
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;
            const dashboardUrl = "https://elearn.ut.ac.ir/my/courses.php";

            // 1. Check if we are EXACTLY on the Dashboard
            if (currentUrl.includes("elearn.ut.ac.ir/my/courses.php")) {
                loading.innerText = "در حال دریافت اطلاعات از داشبورد...";
                emptyState.classList.add('hidden');
                
                chrome.scripting.executeScript({
                    target: {tabId: currentTab.id},
                    files: ['content.js']
                });

            } 
            // 2. Check if we are on elearn, but NOT on the dashboard
            else if (currentUrl.includes("elearn.ut.ac.ir")) {
                loading.classList.add('hidden');
                container.innerHTML = `
                    <div style="text-align:center; padding: 20px; color: #ffbb33;">
                        <p style="margin-bottom:10px;">برای بروزرسانی، باید در صفحه «درس‌های من» باشید.</p>
                        <button id="goToDashBtn" style="
                            background-color: #0d6efd; 
                            color: white; 
                            border: none; 
                            padding: 8px 16px; 
                            border-radius: 5px; 
                            cursor: pointer;
                            font-family: inherit;">
                            رفتن به داشبورد
                        </button>
                    </div>
                `;
                
                // Add click listener to the new button
                document.getElementById('goToDashBtn').addEventListener('click', () => {
                    chrome.tabs.update(currentTab.id, { url: dashboardUrl });
                    window.close(); // Close popup so user sees the page loading
                });

            } 
            // 3. Not on the website at all
            else {
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
            loading.style.backgroundColor = "#aa0000";
        }
    });
});

function loadAssignments() {
    chrome.storage.local.get(['ut_assignments', 'last_updated'], (result) => {
        const container = document.getElementById('container');
        container.innerHTML = ''; 

        if (!result.ut_assignments || result.ut_assignments.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            document.getElementById('stats-bar').innerText = "وضعیت: نیازمند بروزرسانی";
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');

        const pendingCount = result.ut_assignments.filter(t => !t.isSubmitted).length;

        if (result.last_updated) {
            const date = new Date(result.last_updated);
            const minutes = date.getMinutes().toString().padStart(2, '0');
            document.getElementById('stats-bar').innerText = 
                `بروزرسانی: ${date.getHours()}:${minutes} | ${pendingCount} تکلیف باقی‌مانده`;
        }

        const sortedTasks = result.ut_assignments.sort((a, b) => a.isSubmitted - b.isSubmitted);

        sortedTasks.forEach(task => {
            let cardClass = 'soon'; 
            let statusIcon = '📅';
            
            if (task.isSubmitted) {
                cardClass = 'done minimized'; 
                statusIcon = '✅';
            }

            const card = document.createElement('div');
            card.className = `card ${cardClass}`;
            
            card.innerHTML = `
                <div class="card-header" title="${task.isSubmitted ? 'برای نمایش جزئیات کلیک کنید' : ''}">
                    <div class="header-top">
                        <div class="course-name">${task.courseName}</div>
                        ${task.isSubmitted ? '<span class="mini-tag">انجام شد</span>' : ''}
                    </div>
                    <div class="task-title">${statusIcon} ${task.name}</div>
                </div>
                <div class="card-body">
                    <div class="meta-row">
                        <div class="deadline">⌛ ${task.dateString}</div>
                        <a href="${task.link}" target="_blank" class="action-btn">مشاهده</a>
                    </div>
                </div>
            `;

            if (task.isSubmitted) {
                card.addEventListener('click', function(e) {
                    if (e.target.tagName === 'A') return;
                    this.classList.toggle('minimized');
                });
            }

            container.appendChild(card);
        });
    });
}