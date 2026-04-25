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

  // Inicializar UI com dados locais (para rapidez)
  elProfileName.textContent = userData.name;

  let currentMissions = [];

  // Função para buscar dados frescos do Supabase
  async function fetchData() {
    try {
      // 1. Atualizar dados do Utilizador
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();
      
      if (!userError && user) {
        userData = user;
        localStorage.setItem('mission_user', JSON.stringify(userData));
      }

      // 2. Buscar Missões (da tabela missions ou user_missions)
      const { data: missions, error: missionsError } = await supabase
        .from('missions')
        .select('*');

      if (!missionsError && missions && missions.length > 0) {
        currentMissions = missions.map(m => ({
          id: m.id,
          title: m.title,
          category: m.category,
          points: m.points_reward,
          completed: false // Simplificado: para um sistema real, checaríamos user_missions
        }));
      } else {
        // Fallback se a tabela estiver vazia
        currentMissions = [
          { id: '1', title: 'Estudar Programação (1h)', category: 'estudo', points: 5, completed: false },
          { id: '2', title: 'Fazer 30 min de caminhada', category: 'saude', points: 10, completed: false },
          { id: '3', title: 'Organizar ambiente de trabalho', category: 'organizacao', points: 5, completed: false }
        ];
      }

      updateUI();
      renderMissions();
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

  // Função para concluir missão
  window.completeMission = async (id) => {
    const mission = currentMissions.find(m => m.id === id);
    if (!mission || mission.completed) return;

    mission.completed = true;
    
    // Atualizar no Supabase
    const newMonthPoints = userData.current_month_points + mission.points;
    const newTotalPoints = userData.total_points + mission.points;
    const newCompletedTasks = (userData.completed_tasks || 0) + 1;
    let newLevel = Math.floor(newTotalPoints / 50) + 1;

    const { error } = await supabase
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
    
    showToast(`Ganhaste ${mission.points} pontos em ${mission.category}!`, 'gained');

    if (newLevel > userData.level) {
      userData.level = newLevel;
      setTimeout(() => showToast(`Subiste para o Nível ${userData.level}!`, 'levelup'), 1000);
    }

    if (userData.current_month_points >= 100 && (userData.current_month_points - mission.points) < 100) {
      setTimeout(() => showToast(`Parabéns! Completaste a meta mensal de 100 pontos!`, 'levelup'), 1500);
    }

    localStorage.setItem('mission_user', JSON.stringify(userData));
    updateUI();
    renderMissions();
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

  // Inicialização Real
  await fetchData();
});
