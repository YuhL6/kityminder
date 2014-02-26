$( function () {
    var $panel = $( '#social' );
    var $login_btn, $save_btn, $share_btn, $user_btn;

    var baseUrl = ( function () {
        var scripts = document.getElementsByTagName( 'script' );
        for ( var i = 0; i < scripts.length; i++ ) {
            var index = scripts[ i ].src.indexOf( 'social.js' );
            if ( ~index ) {
                return scripts[ i ].src.substr( 0, index );
            }
        }
    } )();

    $login_btn = $.kmuibutton( {
        text: '登录'
    } ).click( function () {
        if ( !currentUser ) {
            login();
        }
    } ).appendTo( $panel );

    var $menu = $.kmuidropmenu( {
        data: [ {
            label: '新建脑图',
            value: 'action_newminder'
        }, {
            divider: true
        }, {
            label: '最近脑图',
            value: 'action_recent'
        } ]
    } ).appendTo( 'body' ).kmui().attachTo( $login_btn );

    var thisMapFilename;
    $save_btn = $( '<button>保存</button>' ).click( function () {
        var data = window.km.exportData( 'json' );
        save( data, 'apps/kityminder/mymind.km', function ( success, info ) {
            if ( success ) {
                $save_btn.text( '保存成功！' );
                setTimeout( function () {
                    $save_btn.removeAttr( 'disabled' ).text( '保存' );
                }, 3000 );
            }
            console.log( info );
        } );
        $save_btn.attr( 'disabled', 'disabled' ).text( '正在保存...' );
    } ).addClass( 'baidu-cloud' );

    $share_btn = $( '<button>分享</button>' ).click( function () {
        if ( $share_btn.attr( 'disabled' ) ) {
            return;
        }

        var data = window.km.exportData( 'json' );
        $share_btn.attr( 'disabled', 'disabled' ).text( '正在分享...' );

        var share_id = uuid();
        var shareUrl = baseUrl + 'index.html?share_id=' + share_id;
        share( data, share_id, function ( success ) {
            if ( success ) {
                var $popup = $( '<div></div>' ).addClass( 'popup' ).appendTo( 'body' );
                $popup.css( {
                    'position': 'absolute',
                    'right': 10,
                    'top': $share_btn.offset().top + $share_btn.height() + 10,
                    'width': 250,
                    'padding': 10,
                    'background': 'white',
                    'border-radius': '5px',
                    'box-shadow': '1px 2px 4px rgba(0, 0, 0, .3)'
                } );
                $popup.append( '<p style="margin: 5px 0; font-size: 12px;">分享成功，请复制URL：</p>' );

                var $input = $( '<input type="text" style="width: 250px;" value="' + shareUrl + '"></input>' ).appendTo( $popup );
                $input[ 0 ].select();

                $popup.mousedown( function ( e ) {
                    e.stopPropagation();
                } );
                $( 'body' ).on( 'mousedown', function ( e ) {
                    $popup.fadeOut( 'fast', function () {
                        $popup.remove();
                    } );
                    $share_btn.removeAttr( 'disabled' ).text( '分享' );
                    $( 'body' ).off( 'mousedown', arguments.callee );
                } );
            }
        } );
    } ).addClass( 'share' );


    baidu.frontia.init( 'wiE55BGOG8BkGnpPs6UNtPbb' );
    var currentUser = baidu.frontia.getCurrentAccount();
    if ( currentUser ) {
        setLogined( currentUser );
    }

    baidu.frontia.social.setLoginCallback( {
        success: setLogined,
        error: function ( error ) {
            console.log( error );
        }
    } );

    function login() {
        var options = {
            response_type: 'token',
            media_type: 'baidu',
            redirect_uri: baseUrl + 'index.html',
            client_type: 'web'
        };
        baidu.frontia.social.login( options );
    }

    function setLogined( user ) {
        currentUser = user;
        $login_btn.text( user.getName() + ' 的文件' );
        $save_btn.appendTo( $panel );
        $share_btn.appendTo( $panel );
        loadRecent();
        loadAvator();
    }

    function loadAvator() {
        currentUser.getDetailInfo( {
            success: function ( user ) {
                var $img = $( '<img />' ).attr( {
                    'src': user.extra.tinyurl,
                    'width': 16,
                    'height': 16
                } );
                $img.prependTo( $login_btn );
            }
        } );
    }

    function loadRecent() {
        var sto = baidu.frontia.personalStorage;
        sto.listFile( 'apps/kityminder/', {
            by: 'time',
            success: function ( result ) {
                if ( result.list.length ) {
                    loadPersonal( result.list[ 0 ].path );
                }
            }
        } );
    }

    function loadPersonal( path ) {
        var sto = baidu.frontia.personalStorage;
        thisMapFilename = path;
        sto.getFileUrl( path, {
            success: function ( url ) {
                $.ajax( {
                    url: url,
                    dataType: 'text',
                    success: function ( result ) {
                        window.km.importData( result, 'json' );
                    }
                } );
            }
        } );
    }

    function save( file, filename, callback ) {
        var sto = baidu.frontia.personalStorage;
        var options = {
            ondup: sto.constant.ONDUP_OVERWRITE,
            success: function ( result ) {
                callback( true, result );
            },
            error: function ( error ) {
                callback( false, error );
            }
        };
        sto.uploadTextFile( file, filename, options );
    }

    function uuid() {
        return ( ( +new Date() * 10000 ) + ( Math.random() * 9999 ) ).toString( 36 );
    }

    function share( text, shareId, callback ) {
        var data = new baidu.frontia.Data( {
            shareMinder: {
                id: shareId,
                data: text
            }
        } );
        var handles = {
            success: function ( result ) {
                callback( true );
            },
            error: function ( e ) {
                callback( false );
            }
        };
        baidu.frontia.storage.insertData( data, handles );
    }

    function loadShare() {
        var pattern = /share_id=(\w+)([&#]|$)/;
        var match = pattern.exec( window.location.href );
        if ( !match ) return;
        var shareId = match[ 1 ];
        var query = new baidu.frontia.storage.Query();
        query.on( 'shareMinder.id' ).equal( shareId );
        baidu.frontia.storage.findData( query, {
            success: function ( ret ) {
                window.km.importData( ret.result[ 0 ].obj.shareMinder.data, 'json' );
            },
            error: function ( e ) {
                console.log( e );
            }
        } );
    }
    loadShare();
} );