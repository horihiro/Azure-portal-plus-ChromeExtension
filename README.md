# Chrome Extension for Azure portal
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/jkcphnjnffinkpflgnpcjagggmjmakdg)
![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/jkcphnjnffinkpflgnpcjagggmjmakdg)
![Chrome Web Store Stars](https://img.shields.io/chrome-web-store/stars/jkcphnjnffinkpflgnpcjagggmjmakdg)
![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/jkcphnjnffinkpflgnpcjagggmjmakdg)

This extension can add features to [Azure portal](https://portal.azure.com).  



https://github.com/horihiro/Azure-portal-plus-ChromeExtension/assets/4566555/89a272f3-52fc-418c-9aa2-723cfca77f53



# Features
![image](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/assets/4566555/c57cc9ae-8fbb-4cb1-aa06-850af9fabeb6)

## 1. Replace favicon to one of the resource displayed

Default state:  
<img src="./popup/img/favicon-before.png">

This feature enabled:  
<img src="./popup/img/favicon-after.png">

<details>
<summary>Favicon replacement rules</summary>
The favicon is replaced by the following rules.

#### Rule1
The icon of the resource group is used as the favicon of the tab, when your browser's tab is opening Azure Resource Groups or your resources in a resource group.

#### Rule2
The icon of the service is used as the favicon of the tab, when your browser's tab is opening an Azure Service (ex. `Virtual Machines`, `Storage accounts`, and so on).

> **Note**
> In case of `App Services`, the icon of `Web Apps` is used though `App Services` contains not only `Web Apps` resource but also `Function App` resource.

#### Rule3
The icon in top of the blade list (i.e. `Overview` ) is used as the favicon of the tab, when your browser's tab is opening your Azure resource.

</details>

## 2. Blink favicon during configuration
<img src="./popup/img/blink-favicon.png">

When starting a process taking long time (deploying new resouces, changing configuration of your resources or deleting your resources), the favicon of the tab is blinked until the process finishes.

## 3. Notify when finishing configuration
<img src="./popup/img/notify2desktop.png">

When finishing a process taking long time, a notification is displayed on your desktop, and the tab can be activated by clicking the notification.

## 4. Activate the portal tab when finishing configuration (Experimental)

When finishing a process taking long time, the tab opening Azure portal is activated (i.e. to be brought to the top) automatically.

## 5. Copy resouce information (v0.0.5 or later)  

Add the following copy menu to the resource page's header and disable built-in `Copy title to clipbord` in `More content actions` menu.  

<img src="./popup/img/advanced-copy-menu.png">

  - `Resource name`
  - `Resource Id`  
    format:  
    ```
    /subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/{resource_provider_name}/{resource_type}/{resource_name}
    ```
  - `Resource name and group as Azure CLI option`  
    format:  
    ```bash
    --name {resource_name} --resource-group {resource_group_name}
    ```
  - `Resource name and group as Azure PowerShell option`  
    format:  
    ```pwsh
    -Name {resource_name} -ResourceGroup {resource_group_name}
    ```
  - `Resource Template (JSON)`  
    format:  
    ```json
    {
      "name": "{resource_name}",
      "id": "/subscriptions/{subscription_id}/resourceGroups/{resource_group_name}/providers/{resource_provider_name}/{resource_type}/{resource_name}",
      "type": "{resource_provider_name}",

        :
    }
    ```
  - Resource and group name as Azure CLI option
  - Resource and group name as Azure PowerShell option

> [!NOTE]
> This feature is available only for each resouce page. On subscriptions, resource groups and Entra ID pages, the copy button is not shown. 

## 6. Restore filter string on each list view (v0.0.6 or later)  (Experimental)

By storing filter string on inputting/updating on each list view, this can restore the filter string on the list view when opening the list view again.

# Try this

### From Chrome Web Store
This extension can be installed from [Chrome Web Store](https://chromewebstore.google.com/detail/azure-portal-plus/jkcphnjnffinkpflgnpcjagggmjmakdg).

### From this repository
If you can try a development version, the following steps are needed.

1. get contents of this repository
    1. clone this repository  
      or
    1. download zip file and extract it
1. open `chrome://extensions`
1. enable `Developer mode` and click `Load Unpacked`
    1. Google Chrome  
      ![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/0656fd3d-41da-4f97-a614-da232a3d700d)
    1. Microsoft Edge  
      ![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/44e7f896-9e82-4af1-ae1b-f864097b44c7)
1. select the directory created by cloning at step 1.

# Change logs

## [0.0.7](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.7)

  - New feature
    - Add a feature to restore fitler string on each list view.

## [0.0.6](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.6)

  - Bug fix
    - Cannot keep a resource icon as the favicon when hiding the sidebar ([#15](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/issues/15))  
  - Improve features
    - Copy ARM template(JSON)

## [0.0.5](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.5)

  - New feature
    - Add a feature to copy resource infomation in various formats.

## [0.0.4](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.4)

  - Improve features
    - Add beforeunload event listener to prevent accidental page leave during blinking favicon ([#8](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/pull/8))
  - New feature
    - Activate the tab opening Azure portal (i.e. bring it to the top) automatically when finishing a process taking long time ([#9](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/pull/9))

## [0.0.3](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.3)

  - Bug fix
    - Refactor main.js to update favicon containers ([#6](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/pull/6))

## [0.0.2](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.2)

  - New features
    - Add the following origins ([#1](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/issues/1))
      - `ms.portal.azure.com`
      - `preview.portal.azure.com`

## [0.0.1](https://github.com/horihiro/Azure-portal-plus-ChromeExtension/releases/tag/0.0.1)
The First release

  - Basic features
    - Replace favicon to one of the resource displayed
    - Blink favicon during configuration
    - Notify when finishing configuration 
