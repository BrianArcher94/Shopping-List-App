output "sql_id" {
    value = azurerm_mssql_server.main.id
  
}

output "sql_fqdn" {
    value = azurerm_mssql_server.main.fully_qualified_domain_name
  
}

output "sqldbs" {
    value = values(azurerm_mssql_database.main)[*].id

}

output "sql_dbnames" {
    value = values(azurerm_mssql_database.main)[*].name

}