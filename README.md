# Chrome Extension for Azure portal
This extension can add features to [Azure portal](https://portal.azure.com).

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


# Try this

### From Chrome Web Store
This extension is not published yet.

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
(T.B.D)
<!-- 
## [0.0.1](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.0.1)
The First release on GitHub

  - Basic features
    - Replace favicon to one of the resource displayed
    - Blink favicon during configuration
    - Notify when finishing configuration -->
