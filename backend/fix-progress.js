const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'tasks.json');

function recalculateProgress() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  let fixedCount = 0;
  let totalTasks = data.tasks.length;

  data.tasks.forEach(task => {
    if (task.todos && task.todos.length > 0) {
      const done = task.todos.filter(t => t.done === true).length;
      const calculatedProgress = Math.round((done / task.todos.length) * 100);
      
      if (task.progress !== calculatedProgress) {
        console.log(`Fixing: "${task.name}" (id: ${task.id}) - progress: ${task.progress}% -> ${calculatedProgress}% (${done}/${task.todos.length} done)`);
        task.progress = calculatedProgress;
        fixedCount++;
      }
    } else if (task.todos && task.todos.length === 0) {
      // Task dengan todos array tapi kosong - progress harus 0
      if (task.progress !== 0) {
        console.log(`Fixing: "${task.name}" (id: ${task.id}) - progress: ${task.progress}% -> 0% (no todos)`);
        task.progress = 0;
        fixedCount++;
      }
    }
  });

  data.metadata.updatedAt = new Date().toISOString();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`\nDone: ${fixedCount} of ${totalTasks} tasks fixed.`);
}

recalculateProgress();