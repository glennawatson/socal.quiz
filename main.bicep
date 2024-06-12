// Variables
@description('Name of the storage account')
param storageAccountName string = 'discordquizbotstorage'

@description('Name of the function app')
param functionAppName string = 'discordquizbotfuncapp'

@description('Name of the app service plan')
param appServicePlanName string = 'discordquizbotplan'

@description('Location for the resources')
param location string = resourceGroup().location

@secure()
@description('Discord Bot Token')
param discordBotToken string

// Resource: Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

// Resource: App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

// Resource: Function App
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'DISCORD_BOT_TOKEN'
          value: discordBotToken
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Output
output functionAppName string = functionApp.name
output storageAccountName string = storageAccount.name
output appServicePlanName string = appServicePlan.name
