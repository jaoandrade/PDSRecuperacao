document.addEventListener('DOMContentLoaded', () => {
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  
  const goToRegister = document.getElementById('go-to-register');
  const goToLogin = document.getElementById('go-to-login');
  
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (goToRegister) {
    goToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'block';
    });
  }

  if (goToLogin) {
    goToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerPanel.style.display = 'none';
      loginPanel.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        // Busca o utilizador na tabela 'users'
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error || !data) {
          alert('Utilizador não encontrado ou erro na conexão.');
          return;
        }

        // Simulação de login (em produção usaria supabase.auth)
        localStorage.setItem('mission_user', JSON.stringify(data));
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Erro no login:', err);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      
      try {
        // Insere o novo utilizador no Supabase
        const { data, error } = await supabase
          .from('users')
          .insert([
            { name, email, level: 1, current_month_points: 0, total_points: 0 }
          ])
          .select()
          .single();

        if (error) {
          alert('Erro ao registar: ' + error.message);
          return;
        }

        localStorage.setItem('mission_user', JSON.stringify(data));
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error('Erro no registo:', err);
      }
    });
  }
});
