# =============================================================================
# FUNCIÓN PARA CONFIGURAR SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA
# =============================================================================

configure_update_system() {
    log_message "STEP" "=== CONFIGURANDO SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA ==="
    
    print_banner
    printf "${WHITE} 🔄 Configurando sistema de actualización automática...${GRAY_LIGHT}\n\n"

    sleep 2

    # Verificar que estamos en el directorio correcto
    if [ ! -d "$PROJECT_ROOT" ]; then
        register_error "No se puede acceder al directorio del proyecto"
        return 1
    fi

    cd "$PROJECT_ROOT"

    # Verificar que el script check-updates.sh existe
    if [ ! -f "check-updates.sh" ]; then
        log_message "WARNING" "Script check-updates.sh no encontrado, descargando desde GitHub..."
        
        # Intentar descargar el script desde el repositorio
        if command -v curl &> /dev/null; then
            curl -o check-updates.sh https://raw.githubusercontent.com/leopoldohuacasiv/watoolxoficial/main/check-updates.sh
        elif command -v wget &> /dev/null; then
            wget -O check-updates.sh https://raw.githubusercontent.com/leopoldohuacasiv/watoolxoficial/main/check-updates.sh
        else
            log_message "ERROR" "No se pudo descargar check-updates.sh"
            return 1
        fi
    fi

    # Dar permisos de ejecución al script
    if [ -f "check-updates.sh" ]; then
        chmod +x check-updates.sh
        log_message "SUCCESS" "✅ Script check-updates.sh configurado correctamente"
    else
        log_message "ERROR" "❌ No se pudo configurar check-updates.sh"
        return 1
    fi

    # Verificar que los archivos del sistema de actualización existen
    local required_files=(
        "backend/src/controllers/SystemController.ts"
        "backend/src/routes/systemRoutes.ts"
        "frontend/src/components/UpdateVersionModal/index.js"
        "frontend/src/translate/languages/es.js"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_message "SUCCESS" "✅ $file encontrado"
        else
            log_message "WARNING" "⚠️ $file no encontrado"
        fi
    done

    # Verificar permisos de Git
    if ! git status &> /dev/null; then
        log_message "WARNING" "⚠️ Git no está configurado correctamente"
        log_message "INFO" "El sistema de actualización requiere Git configurado"
    else
        log_message "SUCCESS" "✅ Git configurado correctamente"
    fi

    log_message "SUCCESS" "✅ Sistema de actualización automática configurado"
    sleep 2
    return 0
}

# =============================================================================
# FUNCIÓN PARA VERIFICAR SISTEMA DE ACTUALIZACIÓN
# =============================================================================

verify_update_system() {
    log_message "STEP" "=== VERIFICANDO SISTEMA DE ACTUALIZACIÓN ==="
    
    print_banner
    printf "${WHITE} 🔍 Verificando sistema de actualización...${GRAY_LIGHT}\n\n"

    sleep 2

    cd "$PROJECT_ROOT"

    # Verificar script de actualización
    if [ -f "check-updates.sh" ]; then
        printf "${GREEN}✅ Script check-updates.sh encontrado${NC}\n"
        
        # Probar script de verificación
        printf "${BLUE}🔄 Probando verificación de actualizaciones...${NC}\n"
        if bash check-updates.sh &> /dev/null; then
            printf "${GREEN}✅ Verificación de actualizaciones funcionando${NC}\n"
        else
            printf "${YELLOW}⚠️ Verificación de actualizaciones con advertencias${NC}\n"
        fi
    else
        printf "${RED}❌ Script check-updates.sh no encontrado${NC}\n"
    fi

    # Verificar archivos del sistema
    local system_files=(
        "backend/src/controllers/SystemController.ts"
        "backend/src/routes/systemRoutes.ts"
        "frontend/src/components/UpdateVersionModal/index.js"
    )

    for file in "${system_files[@]}"; do
        if [ -f "$file" ]; then
            printf "${GREEN}✅ $file encontrado${NC}\n"
        else
            printf "${RED}❌ $file no encontrado${NC}\n"
        fi
    done

    printf "\n${WHITE}📋 Resumen del sistema de actualización:${NC}\n"
    printf "${CYAN}• Verificación automática de actualizaciones${NC}\n"
    printf "${CYAN}• Actualización básica (solo código)${NC}\n"
    printf "${CYAN}• Actualización completa (código + dependencias + BD)${NC}\n"
    printf "${CYAN}• Backup automático antes de actualizar${NC}\n"
    printf "${CYAN}• Rollback automático en caso de error${NC}\n"
    printf "${CYAN}• Interfaz web integrada${NC}\n"

    sleep 3
    return 0
}

