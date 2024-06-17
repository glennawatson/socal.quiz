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

@secure()
@description('Discord Client ID')
param discordClientId string

@secure()
@description('Discord Public Key')
param discordPublicKey string

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
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${listKeys(storageAccount.id, '2022-09-01').keys[0].value};EndpointSuffix=core.windows.net'
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
        {
          name: 'DISCORD_CLIENT_ID'
          value: discordClientId
        }
        {
          name: 'DISCORD_PUBLIC_KEY'
          value: discordPublicKey
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '20.x'
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
