#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Adicionar o diretório do projeto ao path
sys.path.insert(0, str(Path(__file__).parent))

# Tentar importar mysql.connector
try:
    import mysql.connector
except ImportError:
    print("❌ mysql-connector-python não está instalado")
    print("Instalando...")
    os.system("pip3 install mysql-connector-python")
    import mysql.connector

def get_db_connection():
    """Conectar ao banco de dados usando variáveis de ambiente"""
    try:
        # Ler arquivo .env se existir
        env_file = Path(__file__).parent / '.env.local'
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value.strip('"\'')
        
        # Obter credenciais do banco
        db_host = os.getenv('DB_HOST', 'localhost')
        db_user = os.getenv('DB_USER', 'root')
        db_password = os.getenv('DB_PASSWORD', '')
        db_name = os.getenv('DB_NAME', 'agendei')
        
        print(f"🔗 Conectando ao banco: {db_host}/{db_name}...")
        
        conn = mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name
        )
        print("✅ Conectado com sucesso!")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return None

def fix_agendamentos():
    """Limpar e normalizar dados de agendamentos"""
    conn = get_db_connection()
    if not conn:
        sys.exit(1)
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Buscar registros com horaInicio inválido
        print("\n🔍 Buscando agendamentos com horaInicio inválido...")
        cursor.execute("""
            SELECT id, horaInicio, horaFim FROM agendamentos 
            WHERE horaInicio IS NULL 
               OR horaInicio = '' 
               OR horaInicio = 'NaN'
               OR LENGTH(CAST(horaInicio AS CHAR)) < 5
            LIMIT 50
        """)
        invalid_rows = cursor.fetchall()
        
        print(f"📊 Encontrados {len(invalid_rows)} registros com horaInicio inválido")
        
        if invalid_rows:
            print("Exemplos:")
            for row in invalid_rows[:5]:
                print(f"  ID: {row['id']}, horaInicio: \"{row['horaInicio']}\", horaFim: \"{row['horaFim']}\"")
            
            # 2. Corrigir horaInicio
            print("\n🔧 Corrigindo horaInicio inválido para '09:00:00'...")
            cursor.execute("""
                UPDATE agendamentos 
                SET horaInicio = '09:00:00'
                WHERE horaInicio IS NULL 
                   OR horaInicio = '' 
                   OR horaInicio = 'NaN'
                   OR LENGTH(CAST(horaInicio AS CHAR)) < 5
            """)
            print(f"✅ {cursor.rowcount} registros atualizados")
            
            # 3. Corrigir horaFim
            print("🔧 Corrigindo horaFim inválido para '10:00:00'...")
            cursor.execute("""
                UPDATE agendamentos 
                SET horaFim = '10:00:00'
                WHERE horaFim IS NULL 
                   OR horaFim = '' 
                   OR horaFim = 'NaN'
                   OR LENGTH(CAST(horaFim AS CHAR)) < 5
            """)
            print(f"✅ {cursor.rowcount} registros atualizados")
        
        # 4. Normalizar formato de horas (HH:mm -> HH:mm:ss)
        print("\n🔧 Normalizando formato de horas (HH:mm -> HH:mm:ss)...")
        cursor.execute("""
            UPDATE agendamentos 
            SET horaInicio = CONCAT(horaInicio, ':00')
            WHERE LENGTH(CAST(horaInicio AS CHAR)) = 5 
              AND horaInicio LIKE '%:%'
              AND horaInicio NOT LIKE '%:%:%'
        """)
        print(f"✅ {cursor.rowcount} registros atualizados")
        
        cursor.execute("""
            UPDATE agendamentos 
            SET horaFim = CONCAT(horaFim, ':00')
            WHERE LENGTH(CAST(horaFim AS CHAR)) = 5 
              AND horaFim LIKE '%:%'
              AND horaFim NOT LIKE '%:%:%'
        """)
        print(f"✅ {cursor.rowcount} registros atualizados")
        
        # 5. Verificar resultado
        print("\n✨ Verificando resultado...")
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN horaInicio IS NULL OR horaInicio = '' THEN 1 ELSE 0 END) as invalid_inicio,
                   SUM(CASE WHEN horaFim IS NULL OR horaFim = '' THEN 1 ELSE 0 END) as invalid_fim
            FROM agendamentos
        """)
        result = cursor.fetchone()
        print(f"📊 Total de agendamentos: {result['total']}")
        print(f"   horaInicio inválido: {result['invalid_inicio']}")
        print(f"   horaFim inválido: {result['invalid_fim']}")
        
        conn.commit()
        print("\n✅ Limpeza concluída com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    fix_agendamentos()
