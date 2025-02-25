import { fetchAuditsRatio, fetchUser } from "../query/fetch.js";
import { displayXpAmount } from "../profile/display.js";

function xpCircle(cx, cy, radius, data) {
    const arcradius = (cx, cy, radius, degrees) => {
        const radians = (degrees - 90) * Math.PI / 180.0;
        return { x: cx + (radius * Math.cos(radians)), y: cy + (radius * Math.sin(radians)) };
    };

    const decimals = 2;
    let total = data.reduce((sum, item) => sum + item.value, 0);
    let arr = [];
    let beg = 0;
    let count = 0;

    data.forEach((item, i) => {
        let p = ((item.value / total) * 100).toFixed(2);
        count += parseFloat(p);

        if (i === data.length - 1 && count < 100) {
            p = (parseFloat(p) + (100 - count)).toFixed(2);
        }

        const end = beg + ((360 / 100) * p);
        const b = arcradius(cx, cy, radius, end);
        const e = arcradius(cx, cy, radius, beg);
        const la = (end - beg) <= 180 ? 0 : 1;

        const tmp = {
            index: i,
            value: item.value,
            label: item.label,
            data: item,
            d: `M${b.x.toFixed(decimals)} ${b.y.toFixed(decimals)} A${radius} ${radius} 0 ${la} 0 ${e.x.toFixed(decimals)} ${e.y.toFixed(decimals)}`,
            midpoint: arcradius(cx, cy, radius / 2, (beg + end) / 2)
        };

        arr.push(tmp);
        beg = end;
    });

    return arr;
}



export async function renderCircle() {
    const svgElement = document.getElementById('svg');
    if (!svgElement) {
        console.error('SVG element not found');
        return;
    }

    const user = await fetchUser();
    if (!user) return;

    const donutData = [
        { value: user.totalUp, label: 'Done' },
        { value: user.totalDown, label: 'Received' },
    ];

    const centerX = 300, centerY = 300;
    const radius = 200;
    const colors = ['#3AE315', '#E33915'];

    const arr = xpCircle(centerX, centerY, radius, donutData);
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", item.d);
        pathElement.setAttribute("stroke", colors[i]);
        pathElement.setAttribute("fill", "none");
        pathElement.setAttribute("stroke-width", "70");

        // Event listener for mouseover to enlarge the segment and show XP amount
        pathElement.addEventListener('mouseover', () => {
            pathElement.setAttribute("stroke-width", "70"); // Increase stroke width to enlarge segment
            showTooltip(item.label, item.value, event.pageX, event.pageY);
        });

        // Event listener for mouseout to revert the segment size
        pathElement.addEventListener('mouseout', () => {
            pathElement.setAttribute("stroke-width", "90"); // Reset stroke width
            hideTooltip();
        });

        svgElement.appendChild(pathElement);
    }

    displayXpAmount(centerX, centerY, user.auditRatio.toFixed(2));
}


// Function to show tooltip with XP amount
function showTooltip(label, value, x, y) {
    let tooltip = document.getElementById('tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.setAttribute('id', 'tooltip');
        tooltip.style.position = 'absolute';
        tooltip.style.padding = '5px';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.borderRadius = '5px';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = `${label}: ${value} XP`;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y + 10}px`;
}

// Function to hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('receivedAuditsButton').addEventListener('click', () => {
        toggleRotation();
        auditNames('received');

    });
    document.getElementById('doneAuditsButton').addEventListener('click', () => {
        toggleRotation();
        auditNames('done');

    });
    document.getElementById('back').addEventListener('click', () => {
        toggleRotation();
        renderCircle();
    });
});



function toggleRotation() {
    const container = document.getElementById('audit-clickable-container');
    container.classList.toggle('rotated');
}

export async function auditNames(type) {
    const clickableContainer = document.getElementById('audit-clickable-container');
    if (!clickableContainer) {
        console.error('Element with id "audit-clickable-container" not found');
        return;
    }

    try {
        const info = await fetchAuditsRatio();
        if (info) {
            let audits;
            if (type === 'done') {
                audits = info.nonNullGradesData
                    .filter(audit => !audit.path.includes('piscine'))
                    .map(audit => ({
                        grade: audit.grade,
                        path: audit.path.split('/').pop(),
                        type: 'done'
                    }));
            } else {
                audits = info.nullGradesData
                    .filter(audit => !audit.path.includes('piscine'))
                    .map(audit => ({
                        grade: null,
                        path: audit.path.split('/').pop(),
                        type: 'received'
                    }));
            }

            const auditInfoContainer = document.getElementById('audit-info');
            if (auditInfoContainer) {
                auditInfoContainer.innerHTML = '';

                const svgNS = "http://www.w3.org/2000/svg";

                audits.forEach(audit => {
                    const barContainer = document.createElement('div');
                    barContainer.classList.add('auditbar');

                    const svg = document.createElementNS(svgNS, "svg");
                    svg.setAttribute("width", "100%");
                    svg.setAttribute("height", "30");

                    if (audit.grade !== null) {
                        const rect = document.createElementNS(svgNS, "rect");
                        const barWidth = Math.min(audit.grade * 10, 100);
                        rect.setAttribute("width", `${barWidth}%`);
                        rect.setAttribute("height", "30");
                        rect.setAttribute("fill", "steelblue");

                        const text = document.createElementNS(svgNS, "text");
                        text.setAttribute("x", "5");
                        text.setAttribute("y", "20");
                        text.setAttribute("fill", "white");
                        text.setAttribute("font-size", "15px");
                        text.textContent = audit.grade;

                        svg.appendChild(rect);
                        svg.appendChild(text);
                    }

                    const pathText = document.createElementNS(svgNS, "text");
                    const xPosition = audit.grade !== null ? `${Math.min(audit.grade * 10, 100) + 2}%` : '0';

                    pathText.setAttribute("x", xPosition);
                    pathText.setAttribute("y", "20");
                    pathText.setAttribute("fill", "white");
                    pathText.setAttribute("font-size", "15px");
                    pathText.textContent = audit.path;

                    svg.appendChild(pathText);
                    barContainer.appendChild(svg);
                    auditInfoContainer.appendChild(barContainer);
                });
            } else {
                console.error("Error: 'audit-info' container not found.");
            }
        }
    } catch (error) {
        console.error("Error in auditNames function:", error);
    }
}
