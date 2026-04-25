document.addEventListener('DOMContentLoaded', async () => {
  // Verificar Autenticação Local (Token de sessão simplificado)
  let userData = JSON.parse(localStorage.getItem('mission_user'));
  if (!userData) {
    window.location.href = 'index.html';
    return;
  }

  // Elementos do DOM
  const elProfileName = document.getElementById('profile-name');
  const elProfileLevel = document.getElementById('profile-level');
  const elStatLevel = document.getElementById('stat-level');
  const elCurrentPoints = document.getElementById('current-points');
  const elMonthProgress = document.getElementById('month-progress');
  const elStatTotalPoints = document.getElementById('stat-total-points');
  const elStatTasksDone = document.getElementById('stat-tasks-done');
  const missionsContainer = document.getElementById('missions-container');
  const btnLogout = document.getElementById('logout-btn');
  const elCurrentDate = document.getElementById('current-date');
  const customTaskForm = document.getElementById('custom-task-form');
  const elStatStreak = document.getElementById('stat-streak');
  const elQuote = document.getElementById('daily-quote');
  const activityFeedContainer = document.getElementById('activity-feed-container');
  const calendarGrid = document.getElementById('calendar-grid');
  const calendarMonthName = document.getElementById('calendar-month-name');

  if (elCurrentDate) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elCurrentDate.textContent = today.toLocaleDateString('pt-PT', options);
  }

  if (elQuote) {
    const quotes = [
      "A disciplina é a ponte entre objetivos e realizações.",
      "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
      "Não importa o quão devagar fores, desde que não pares.",
      "A motivação faz-te começar, o hábito faz-te continuar.",
      "Faz hoje o que te vai orgulhar amanhã.",
      "O segredo para avançar é começar."
    ];
    const quoteIndex = new Date().getDay() % quotes.length;
    elQuote.textContent = `"${quotes[quoteIndex]}"`;
  }

  // Inicializar UI com dados locais (para rapidez)
  elProfileName.textContent = userData.name;

  let currentMissions = [];

  // Função para buscar dados frescos do Supabase
  async function fetchData() {
    try {
      // 1. Atualizar dados do Utilizador
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();
      
      if (!userError && user) {
        userData = user;
        localStorage.setItem('mission_user', JSON.stringify(userData));
      }

      // 2. Buscar Missões (da tabela missions ou user_missions)
      const { data: missions, error: missionsError } = await supabaseClient
        .from('missions')
        .select('*');

      // Buscar missões personalizadas do utilizador
      const { data: userMissions, error: userMissionsError } = await supabaseClient
        .from('user_missions')
        .select('*')
        .eq('user_id', userData.id)
        .eq('is_completed', false);

      let fetchedMissions = [];

      if (!missionsError && missions && missions.length > 0) {
        fetchedMissions = missions.map(m => ({
          id: m.id,
          title: m.title,
          category: m.category,
          points: m.points_reward,
          completed: false
        }));
      }

      if (!userMissionsError && userMissions && userMissions.length > 0) {
        const customMissions = userMissions.map(m => ({
          id: m.id,
          title: m.custom_title,
          category: m.category,
          points: m.points_reward,
          completed: m.is_completed,
          isCustom: true
        }));
        fetchedMissions = [...fetchedMissions, ...customMissions];
      }

      if (fetchedMissions.length > 0) {
        currentMissions = fetchedMissions;
      } else {
        // Fallback se a tabela estiver vazia
        currentMissions = [
          { id: '1', title: 'Estudar Programação (1h)', category: 'estudo', points: 5, completed: false },
          { id: '2', title: 'Fazer 30 min de caminhada', category: 'saude', points: 10, completed: false },
          { id: '3', title: 'Organizar ambiente de trabalho', category: 'organizacao', points: 5, completed: false }
        ];
      }

      // Fetch user_progress_logs para feed e calendário
      const { data: logs, error: logsError } = await supabaseClient
        .from('user_progress_logs')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });
        
      let userLogs = (!logsError && logs) ? logs : [];

      updateUI();
      renderMissions();
      renderActivityFeed(userLogs);
      renderCalendar(userLogs);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }

  // Atualizar UI Geral
  function updateUI() {
    elProfileLevel.textContent = userData.level;
    elStatLevel.textContent = userData.level;
    elStatTotalPoints.textContent = userData.total_points;
    elCurrentPoints.textContent = userData.current_month_points;
    
    // Buscar contagem real de missões concluídas se tivéssemos user_missions
    elStatTasksDone.textContent = userData.completed_tasks || 0; 
    
    let percentage = Math.min((userData.current_month_points / 100) * 100, 100);
    elMonthProgress.style.width = percentage + '%';
  }

  // Renderizar Missões
  function renderMissions() {
    missionsContainer.innerHTML = '';
    
    currentMissions.forEach(mission => {
      const card = document.createElement('div');
      card.className = `mission-card ${mission.completed ? 'completed' : ''}`;
      
      const categoryClass = `cat-${mission.category}`;
      const categoryName = mission.category.charAt(0).toUpperCase() + mission.category.slice(1);
      
      card.innerHTML = `
        <div class="mission-info">
          <span class="mission-category ${categoryClass}">${categoryName}</span>
          <div class="mission-details">
            <h4>${mission.title}</h4>
            <span class="points-badge">+${mission.points} XP <i class="fas fa-star"></i></span>
          </div>
        </div>
        <button class="complete-btn" onclick="completeMission('${mission.id}')">
          ${mission.completed ? '<i class="fas fa-check"></i> Feito' : 'Concluir'}
        </button>
      `;
      missionsContainer.appendChild(card);
    });
  }

  function renderActivityFeed(logs) {
    if (!activityFeedContainer) return;
    activityFeedContainer.innerHTML = '';
    
    if (logs.length === 0) {
      activityFeedContainer.innerHTML = '<li style="color: var(--text-muted); font-size: 0.9rem; text-align: center; list-style: none;">Sem atividade recente...</li>';
      return;
    }
    
    // Mostra apenas os 10 mais recentes
    logs.slice(0, 10).forEach(log => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      
      const iconClass = log.level_up_occurred ? 'fa-level-up-alt' : 'fa-check';
      const iconColor = log.level_up_occurred ? 'var(--primary-color)' : 'var(--success)';
      const date = new Date(log.created_at);
      
      li.innerHTML = `
        <div class="activity-icon" style="color: ${iconColor}"><i class="fas ${iconClass}"></i></div>
        <div class="activity-content">
          <div class="activity-text">${log.description || 'Tarefa concluída'} <span style="color:var(--success); font-weight:bold;">+${log.points_earned} XP</span></div>
          <div class="activity-time">${date.toLocaleDateString('pt-PT')} às ${date.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      `;
      activityFeedContainer.appendChild(li);
    });
  }

  function renderCalendar(logs) {
    if (!calendarGrid || !calendarMonthName) return;
    
    const today = new Date();
    calendarMonthName.textContent = today.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    calendarGrid.innerHTML = '';
    
    // Agrupar pontos por dia
    const pointsPerDay = {};
    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0];
      pointsPerDay[dateStr] = (pointsPerDay[dateStr] || 0) + log.points_earned;
    });

    // Calcular Streak
    let currentStreak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      // Consideramos "dia concluído" se ganhou pelo menos 10 pontos
      if (pointsPerDay[dateStr] && pointsPerDay[dateStr] >= 10) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        const isToday = checkDate.toDateString() === today.toDateString();
        if (isToday) {
            checkDate.setDate(checkDate.getDate() - 1);
            const yesterdayStr = checkDate.toISOString().split('T')[0];
            if (pointsPerDay[yesterdayStr] && pointsPerDay[yesterdayStr] >= 10) {
                // Streak mantém-se se ainda tem de completar as de hoje
            } else {
                break;
            }
        } else {
            break;
        }
      }
    }
    
    if (elStatStreak) {
      elStatStreak.textContent = `${currentStreak} 🔥`;
    }

    // Gerar grelha do calendário
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      // Fuso horário local offset para evitar que mude de dia
      const localDateStr = new Date(dayDate.getTime() - (dayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      dayDiv.textContent = i;
      
      if (localDateStr === todayStr) {
        dayDiv.classList.add('day-today');
      }
      
      if (pointsPerDay[localDateStr] && pointsPerDay[localDateStr] >= 10) {
        dayDiv.classList.add('day-completed');
      }
      
      calendarGrid.appendChild(dayDiv);
    }
  }

  // Função para concluir missão
  window.completeMission = async (id) => {
    const mission = currentMissions.find(m => m.id === id);
    if (!mission || mission.completed) return;

    mission.completed = true;

    if (mission.isCustom) {
      await supabaseClient
        .from('user_missions')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', mission.id);
    }
    
    // Atualizar no Supabase
    const newMonthPoints = userData.current_month_points + mission.points;
    const newTotalPoints = userData.total_points + mission.points;
    const newCompletedTasks = (userData.completed_tasks || 0) + 1;
    let newLevel = Math.floor(newTotalPoints / 50) + 1;

    const { error } = await supabaseClient
      .from('users')
      .update({ 
        current_month_points: newMonthPoints, 
        total_points: newTotalPoints,
        completed_tasks: newCompletedTasks,
        level: newLevel
      })
      .eq('id', userData.id);

    if (error) {
      alert('Erro ao guardar progresso: ' + error.message);
      return;
    }

    // Atualizar localmente para feedback imediato
    userData.current_month_points = newMonthPoints;
    userData.total_points = newTotalPoints;
    userData.completed_tasks = newCompletedTasks;
    
    let levelUp = false;
    if (newLevel > userData.level) {
      userData.level = newLevel;
      levelUp = true;
      setTimeout(() => showToast(`Subiste para o Nível ${userData.level}!`, 'levelup'), 1000);
    }

    // Registar no feed
    try {
      await supabaseClient.from('user_progress_logs').insert([{
        user_id: userData.id,
        points_earned: mission.points,
        description: `Concluiu: ${mission.title}`,
        level_up_occurred: levelUp
      }]);
    } catch(err) { console.error(err); }
    
    showToast(`Ganhaste ${mission.points} pontos em ${mission.category}!`, 'gained');

    if (userData.current_month_points >= 100 && (userData.current_month_points - mission.points) < 100) {
      setTimeout(() => showToast(`Parabéns! Completaste a meta mensal de 100 pontos!`, 'levelup'), 1500);
    }

    localStorage.setItem('mission_user', JSON.stringify(userData));
    // Re-fetch para atualizar calendário e feed
    await fetchData();
  };

  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = type === 'levelup' ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-star"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('mission_user');
    window.location.href = 'index.html';
  });

  if (customTaskForm) {
    customTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('custom-task-title').value;
      const category = document.getElementById('custom-task-category').value;
      
      const tempId = 'custom-' + Date.now();
      const newTask = {
        id: tempId,
        title: title,
        category: category,
        points: 5, // Pontos base para tarefa personalizada
        completed: false,
        isCustom: true
      };

      try {
        const { data, error } = await supabaseClient
          .from('user_missions')
          .insert([{
            user_id: userData.id,
            custom_title: title,
            category: category,
            points_reward: 5,
            is_completed: false
          }])
          .select()
          .single();
          
        if (!error && data) {
          newTask.id = data.id; // Atualiza com o ID real da BD
        } else {
          console.warn('Não foi possível guardar na BD, mas foi adicionada localmente.', error);
        }
      } catch (err) {
        console.error(err);
      }

      currentMissions.push(newTask);
      renderMissions();
      
      document.getElementById('custom-task-title').value = '';
      showToast('Tarefa personalizada adicionada!', 'gained');
    });
  }

  // Inicialização Real
  await fetchData();
});
